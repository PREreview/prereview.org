// oxlint-disable no-comments/disallowComments
// SKETCH — not compiled. Shapes follow effect@4.1.2 (`effect/workflow`, `effect/cluster`)
// and the existing conventions in src/Domain/DatasetReviews.

import {
  Array,
  Data,
  Effect,
  identity,
  Layer,
  Match,
  Metric,
  Option,
  pipe,
  PubSub,
  Schedule,
  Schema,
  type Scope,
} from 'effect'
import { Activity, Workflow, type WorkflowEngine } from 'effect/workflow'
import * as Events from '../../Events.ts'
import * as EventStore from '../../EventStore.ts'
import { Doi, OrcidId, Temporal, Uuid } from '../../types/index.ts'

// ─────────────────────────────────────────────────────────────────────────────
// 1. Events
//
// The request event is a *snapshot* of everything the workflow needs. That
// makes payload = event, so the execution id can be recomputed from the event
// alone, at any time, with no other state.
// ─────────────────────────────────────────────────────────────────────────────

export class PublicationOfReviewWasRequested extends Schema.TaggedClass<PublicationOfReviewWasRequested>()(
  'PublicationOfReviewWasRequested',
  {
    reviewId: Uuid.UuidSchema,
    requestedAt: Temporal.InstantSchema,
    authorId: OrcidId.OrcidIdSchema,
    title: Schema.String,
    body: Schema.String,
    // ...whatever Zenodo / Slack / etc. need. No lookups inside the workflow
    // that could return something different on a replay.
  },
) {}

export class ReviewPublicationWasCompleted extends Schema.TaggedClass<ReviewPublicationWasCompleted>()(
  'ReviewPublicationWasCompleted',
  {
    reviewId: Uuid.UuidSchema,
    doi: Doi.DoiSchema,
    zenodoRecordId: Schema.Number,
  },
) {}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Workflow definition
// ─────────────────────────────────────────────────────────────────────────────

class FailedToPublishReview extends Schema.TaggedErrorClass<FailedToPublishReview>()('FailedToPublishReview', {
  cause: Schema.optional(Schema.Defect()),
}) {}

export const PublishReview = Workflow.make('PublishReview', {
  // Payload is the request event's fields. `execute(event)` just works.
  payload: PublicationOfReviewWasRequested.fields,
  success: Schema.Struct({ doi: Doi.DoiSchema }),
  error: FailedToPublishReview,
  // executionId = hash(`${tag.length}:${tag}:${idempotencyKey(payload)}`)
  // → deterministic. Don't rename the workflow or change this key once
  //   executions exist, or you lose the link to their stored state.
  idempotencyKey: ({ reviewId }) => reviewId,
}).annotate(Workflow.SuspendOnFailure, true)
// With SuspendOnFailure:
//  - any failure/defect (in the workflow body *or in an activity*) is stored as
//    `Suspended { failed: true, cause }` instead of `Complete(Failure)`.
//  - automatic wake-ups skip failed suspensions; only an explicit
//    `PublishReview.resume(executionId)` (or interrupt) moves it on.
//  - on resume the run replays: completed activities return their memoised
//    result, the failed activity's stored "Suspended" reply is reset and it
//    *re-executes*. That's what makes "manual retry" actually retry.

// ─────────────────────────────────────────────────────────────────────────────
// 3a. One retry policy for every activity
//
// The engine has no global "retry failed activities" option, so we build every
// activity through one constructor that applies the policy.
//
// The retry has to live INSIDE `execute` (plain Effect.retry). Neither of the
// "outside" options works with SuspendOnFailure:
//  - Retrying the activity from outside (`activity.pipe(Activity.retry(...))`):
//    the first failure is stored as Suspended{failed} and the workflow suspends
//    itself with an interrupt. Effect.retry doesn't retry interrupts, so you
//    never get a second attempt.
//  - Retrying the whole workflow body: it fails the same way, and Activity.retry
//    around the body would also bump CurrentAttempt for activities that
//    already succeeded, so they would run again.
//
// Inside `execute`, the attempts happen before anything is persisted. Only the
// final, exhausted failure reaches the engine, where SuspendOnFailure (which
// activities inherit from the workflow) stores it as Suspended{failed}.
// ─────────────────────────────────────────────────────────────────────────────

export const defaultActivityRetry = {
  schedule: Schedule.exponential('1 second', 2).pipe(Schedule.either(Schedule.spaced('1 minute'))),
  times: 6, // ~1s, 2s, 4s, 8s, 16s, 32s → about 1 minute before we park it
}

const durableActivity = <Success extends Schema.Top = typeof Schema.Void, R = never>(options: {
  readonly name: string
  readonly success?: Success
  readonly execute: Effect.Effect<Success['Type'], unknown, R>
  // Opt-outs per call site; the default applies everywhere else.
  readonly retry?: typeof defaultActivityRetry | false
  readonly isRetryable?: (error: unknown) => boolean
}) =>
  Activity.make({
    name: options.name,
    success: options.success,
    error: FailedToPublishReview,
    execute: options.execute.pipe(
      options.retry === false
        ? identity
        : Effect.retry({
            ...(options.retry ?? defaultActivityRetry),
            while: options.isRetryable ?? (() => true),
          }),
      // The workflow's Suspended reply has `failed: true` but no cause for an
      // activity failure: the cause is only on the activity's own reply. So
      // log it here, where the error is visible, tagged with the execution id.
      Effect.tapError(error =>
        Effect.gen(function* () {
          const key = yield* Activity.idempotencyKey(options.name)
          yield* Effect.logError('Activity exhausted retries; workflow will suspend').pipe(
            Effect.annotateLogs({ activity: options.name, activityKey: key, error }),
          )
        }),
      ),
      Effect.mapError(cause => new FailedToPublishReview({ cause })),
    ),
  })

// ─────────────────────────────────────────────────────────────────────────────
// 3b. Workflow implementation
//
// Each external interaction is its own Activity so a retry resumes from the
// step that failed instead of starting over.
// ─────────────────────────────────────────────────────────────────────────────

export const PublishReviewLayer = PublishReview.toLayer(
  Effect.fn('PublishReview')(function* (request) {
    const { recordId } = yield* durableActivity({
      name: 'CreateZenodoRecord',
      success: Schema.Struct({ recordId: Schema.Number }),
      execute: Effect.gen(function* () {
        // An activity can run more than once (crash after the HTTP call but
        // before the reply is persisted). Pass a stable key where the external
        // API supports it, or look-before-create.
        const key = yield* Activity.idempotencyKey('CreateZenodoRecord')
        return yield* Zenodo.createRecord({ ...request, idempotencyKey: key })
      }),
      // e.g. don't burn a minute retrying a 400 from Zenodo
      isRetryable: error => !(error instanceof Zenodo.ValidationError),
    })

    const doi = yield* durableActivity({
      name: 'PublishZenodoRecord',
      success: Doi.DoiSchema,
      execute: Zenodo.publishRecord(recordId),
    })

    yield* durableActivity({
      name: 'NotifyCommunitySlack',
      execute: Slack.notify({ reviewId: request.reviewId, doi }),
    })

    // Last step: write the outcome back to the event store. Make it
    // idempotent, since this activity can also run twice.
    yield* durableActivity({
      name: 'RecordPublicationCompleted',
      execute: recordPublicationCompleted({ reviewId: request.reviewId, doi, zenodoRecordId: recordId }),
    })

    return { doi }
  }),
)

const completedFilter = (reviewId: Uuid.Uuid) =>
  Events.EventFilter({ types: ['ReviewPublicationWasCompleted'], predicates: { reviewId } })

const recordPublicationCompleted = Effect.fn(function* (fields: typeof ReviewPublicationWasCompleted.Type) {
  const existing = yield* EventStore.query(completedFilter(fields.reviewId))
  if (Option.isSome(existing)) return

  yield* EventStore.appendIf(new ReviewPublicationWasCompleted(fields), {
    filter: completedFilter(fields.reviewId),
    lastKnownPosition: Option.none(),
  }).pipe(Effect.catchTag('NewEventsFound', () => Effect.void))
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. Command: persist the request (the only thing the web request does)
// ─────────────────────────────────────────────────────────────────────────────

export const requestPublication = Effect.fn(function* (input: typeof PublicationOfReviewWasRequested.Type) {
  const requestedFilter = Events.EventFilter({
    types: ['PublicationOfReviewWasRequested'],
    predicates: { reviewId: input.reviewId },
  })
  // Only one request per review, so one execution id per review.
  yield* EventStore.appendIf(new PublicationOfReviewWasRequested(input), {
    filter: requestedFilter,
    lastKnownPosition: Option.none(),
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. Reaction: event → start workflow
// ─────────────────────────────────────────────────────────────────────────────

export const reactionsWorker = Layer.effectDiscard(
  Effect.gen(function* () {
    const dequeue = yield* PubSub.subscribe(yield* Events.Events)
    return yield* pipe(
      PubSub.take(dequeue),
      Effect.andThen(
        pipe(
          Match.type<Events.Event>(),
          Match.tag('PublicationOfReviewWasRequested', event => PublishReview.execute(event, { discard: true })),
          Match.orElse(() => Effect.void),
        ),
      ),
      Effect.forever,
    )
  }) satisfies Effect.Effect<never, never, Events.Events | Scope.Scope | WorkflowEngine.WorkflowEngine>,
)
// The PubSub only sees events appended by this process while it's up. If we
// crash between append and execute, nothing starts the workflow, so the
// reconciler (below) runs `execute` again for anything not completed.
// That's safe because execute with the same executionId joins the existing run.

// ─────────────────────────────────────────────────────────────────────────────
// 6. Observability: derive status from events + engine
// ─────────────────────────────────────────────────────────────────────────────

export type PublicationStatus = Data.TaggedEnum<{
  Completed: {}
  // No reply stored yet: either running now or never dispatched. `poll` can't
  // tell these apart. The reconciler re-executes, which covers both.
  InFlight: {}
  // SuspendOnFailure fired. Needs a manual resume. For activity failures the
  // engine leaves `cause` undefined; see the log from durableActivity.
  Failed: { readonly cause: unknown }
  // Suspended for a non-failure reason (DurableClock, DurableDeferred...).
  Waiting: {}
  // Only reachable without SuspendOnFailure, or after an explicit interrupt.
  Terminated: { readonly exit: unknown }
}>
const PublicationStatus = Data.taggedEnum<PublicationStatus>()

export interface Tracked {
  readonly request: PublicationOfReviewWasRequested
  readonly executionId: string
  readonly status: PublicationStatus
}

export const listPublications = Effect.gen(function* () {
  const found = yield* EventStore.query(
    Events.EventFilter({ types: ['PublicationOfReviewWasRequested', 'ReviewPublicationWasCompleted'] }),
  )
  const events = Option.match(found, { onNone: () => [], onSome: ({ events }) => events })

  const completed = new Set(
    Array.filterMap(events, e =>
      e._tag === 'ReviewPublicationWasCompleted' ? Option.some(e.reviewId) : Option.none(),
    ),
  )
  const requests = Array.filter(events, e => e._tag === 'PublicationOfReviewWasRequested')

  return yield* Effect.forEach(
    requests,
    Effect.fnUntraced(function* (request): Effect.fn.Return<Tracked, never, WorkflowEngine.WorkflowEngine> {
      const executionId = yield* PublishReview.executionId(request)

      // The event store answers "completed" cheaply; only ask the engine about the rest.
      if (completed.has(request.reviewId)) {
        return { request, executionId, status: PublicationStatus.Completed() }
      }

      const result = yield* PublishReview.poll(executionId)
      const status = Option.match(result, {
        onNone: () => PublicationStatus.InFlight(),
        onSome: Match.valueTags({
          Suspended: s => (s.failed ? PublicationStatus.Failed({ cause: s.cause }) : PublicationStatus.Waiting()),
          // Complete(Success) with no completion event shouldn't happen, since
          // the last activity writes it. Treat it as Completed but worth alerting on.
          Complete: c =>
            c.exit._tag === 'Success' ? PublicationStatus.Completed() : PublicationStatus.Terminated({ exit: c.exit }),
        }),
      })
      return { request, executionId, status }
    }),
    { concurrency: 10 },
  )
})

const countByStatus = (tracked: ReadonlyArray<Tracked>) =>
  Array.reduce(tracked, {} as Record<PublicationStatus['_tag'], number>, (acc, { status }) => ({
    ...acc,
    [status._tag]: (acc[status._tag] ?? 0) + 1,
  }))

// Gauges for dashboards/alerting (e.g. alert on Failed > 0).
const publicationsGauge = Metric.gauge('review_publication_workflows', {
  description: 'PublishReview executions by status',
})

// Reconciler + metrics in one loop.
export const reconcilerWorker = Layer.effectDiscard(
  pipe(
    Effect.gen(function* () {
      const tracked = yield* listPublications

      // (Re)dispatch anything that might never have started. Idempotent.
      yield* Effect.forEach(
        Array.filter(tracked, t => t.status._tag === 'InFlight'),
        t => PublishReview.execute(t.request, { discard: true }),
        { discard: true },
      )

      const counts = countByStatus(tracked)
      yield* Effect.forEach(
        ['Completed', 'InFlight', 'Failed', 'Waiting', 'Terminated'] as const,
        status => Metric.update(Metric.withAttributes(publicationsGauge, { status }), counts[status] ?? 0),
        { discard: true },
      )
    }),
    Effect.catchCause(cause => Effect.logError('Publication reconciler failed', cause)),
    Effect.repeat(Schedule.spaced('1 minute')),
    Effect.forkScoped,
  ),
)

// ─────────────────────────────────────────────────────────────────────────────
// 7. Manual retry: an admin route / CLI command
//
// resume() only acts when the stored reply is Suspended (and resets it), so
// calling it on a running or completed execution is a no-op.
// ─────────────────────────────────────────────────────────────────────────────

export const retryPublication = Effect.fn(function* (reviewId: Uuid.Uuid) {
  const found = yield* EventStore.query(
    Events.EventFilter({ types: ['PublicationOfReviewWasRequested'], predicates: { reviewId } }),
  )
  const request = yield* Option.map(found, ({ events }) => events[0])

  yield* PublishReview.resume(yield* PublishReview.executionId(request))
})

export const retryAllFailedPublications = Effect.gen(function* () {
  const failed = Array.filter(yield* listPublications, t => t.status._tag === 'Failed')
  yield* Effect.forEach(failed, t => PublishReview.resume(t.executionId), { discard: true })
  return failed.length
})

// Abandon one for good, e.g. bad data in the request. The status becomes Terminated.
export const abandonPublication = (executionId: string) => PublishReview.interrupt(executionId)

// ─────────────────────────────────────────────────────────────────────────────
// placeholders for external interactions
// ─────────────────────────────────────────────────────────────────────────────
declare const Zenodo: {
  ValidationError: new (...args: Array<unknown>) => Error
  createRecord: (input: unknown) => Effect.Effect<{ recordId: number }, Error>
  publishRecord: (recordId: number) => Effect.Effect<Doi.Doi, Error>
}
declare const Slack: { notify: (input: unknown) => Effect.Effect<void, Error> }
