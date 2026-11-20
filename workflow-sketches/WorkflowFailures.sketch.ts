// SKETCH: read failed workflow executions and their failed activity straight
// from the cluster's message storage (Postgres, default prefix "cluster").
//
// How the engine stores things (effect@4.1.2, ClusterWorkflowEngine + SqlMessageStorage):
//   cluster_messages: one row per request
//     entity_type = 'Workflow/<WorkflowName>'
//     entity_id   = executionId
//     tag         = 'run' | 'activity' | 'deferred' | 'resume'
//     payload     = JSON. For 'run': the workflow payload. For 'activity': { name, attempt, withTransaction }
//   cluster_replies: the result, joined on request_id = cluster_messages.id, kind = 0 (WithExit)
//     payload = JSON Exit, e.g. for a failure under SuspendOnFailure:
//       { "_tag": "Success",
//         "value": { "_tag": "Suspended", "failed": true,
//                    "cause": [ { "_tag": "Die",
//                                 "defect": { "name": "FailedToPublishReview", "message": "",
//                                             "cause": { "name": "ZenodoUnavailable", "message": "503 from Zenodo" } } } ] } }
//
// The 'run' reply has failed: true but NO cause when an activity failed.
// The cause is only on that activity's reply. resume() deletes ("resets")
// both replies, so these queries always show the current state, not history.
//
// These tables are engine internals, not a public API. Pin the effect
// version and keep a test that checks these queries against a real failed run.

import { Effect, Schema } from 'effect'
import { SqlClient } from 'effect/sql'

const ActivityFailure = Schema.Struct({
  activity: Schema.String,
  attempt: Schema.Number,
  // [{ _tag: 'Die', defect: { name, message, cause? } }]. Only name/message/cause
  // survive encoding (no _tag fields, no stack), so give errors useful messages.
  cause: Schema.Unknown,
})

export const FailedExecution = Schema.Struct({
  executionId: Schema.String,
  workflowPayload: Schema.Unknown, // = the request event fields
  failedActivity: Schema.NullOr(ActivityFailure), // null → the workflow body itself failed
  workflowCause: Schema.Unknown, // set only when the body (not an activity) failed
})

// 1 + 2 in one query: every failed-suspended execution with its failed activity
export const listFailedExecutions = Effect.fn('listFailedExecutions')(function* (workflowName: string) {
  const sql = yield* SqlClient.SqlClient
  const entityType = `Workflow/${workflowName}`

  const rows = yield* sql`
    SELECT
      run.entity_id                                 AS execution_id,
      run.payload::jsonb                            AS workflow_payload,
      run_reply.payload::jsonb #> '{value,cause}'   AS workflow_cause,
      failed_act.activity,
      failed_act.attempt,
      failed_act.cause                              AS activity_cause
    FROM cluster_messages run
    JOIN cluster_replies run_reply
      ON run_reply.request_id = run.id AND run_reply.kind = 0
    -- the failed activity, if any. LATERAL so executions where the body
    -- failed (no failed activity) still come back, with NULLs here.
    LEFT JOIN LATERAL (
      SELECT
        act.payload::jsonb ->> 'name'               AS activity,
        (act.payload::jsonb ->> 'attempt')::int     AS attempt,
        act_reply.payload::jsonb #> '{value,cause}' AS cause
      FROM cluster_messages act
      JOIN cluster_replies act_reply
        ON act_reply.request_id = act.id AND act_reply.kind = 0
      WHERE act.entity_type = run.entity_type
        AND act.entity_id   = run.entity_id
        AND act.tag         = 'activity'
        AND act_reply.payload::jsonb #>> '{value,failed}' = 'true'
    ) failed_act ON true
    WHERE run.entity_type = ${entityType}
      AND run.tag = 'run'
      AND run_reply.payload::jsonb #>> '{value,_tag}'   = 'Suspended'
      AND run_reply.payload::jsonb #>> '{value,failed}' = 'true'
  `

  return rows.map(row => ({
    executionId: row['execution_id'] as string,
    workflowPayload: row['workflow_payload'],
    workflowCause: row['workflow_cause'],
    failedActivity:
      row['activity'] === null
        ? null
        : { activity: row['activity'] as string, attempt: row['attempt'] as number, cause: row['activity_cause'] },
  }))
})

// 2 on its own: given an execution id (e.g. from PublishReview.executionId(event))
export const getFailedActivity = Effect.fn('getFailedActivity')(function* (workflowName: string, executionId: string) {
  const sql = yield* SqlClient.SqlClient

  const rows = yield* sql`
    SELECT
      act.payload::jsonb ->> 'name'               AS activity,
      (act.payload::jsonb ->> 'attempt')::int     AS attempt,
      act_reply.payload::jsonb #> '{value,cause}' AS cause
    FROM cluster_messages act
    JOIN cluster_replies act_reply
      ON act_reply.request_id = act.id AND act_reply.kind = 0
    WHERE act.entity_type = ${`Workflow/${workflowName}`}
      AND act.entity_id   = ${executionId}
      AND act.tag = 'activity'
      AND act_reply.payload::jsonb #>> '{value,failed}' = 'true'
  `

  return rows.map(row => ({
    activity: row['activity'] as string,
    attempt: row['attempt'] as number,
    cause: row['cause'],
  }))
})

// Usage alongside the event-sourced view:
//
//   const failed = yield* listFailedExecutions(PublishReview._tag)
//   // join to events by executionId, or just read workflowPayload.reviewId
//   for (const f of failed) yield* PublishReview.resume(f.executionId)
//
// To stay within the public API, use MessageStorage.requestIdForPrimaryKey
// with { address: { entityType, entityId: executionId, shardId }, tag: 'activity',
// id: `${activityName}/${attempt}` } and then repliesForUnfiltered. That needs
// each activity name and the shard id (Sharding.getShardId), and it can't list
// "all failed" executions. The SQL above is much simpler for an admin view.
