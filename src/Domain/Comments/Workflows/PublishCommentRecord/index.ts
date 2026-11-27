import { Duration, Effect, pipe, Schema, Struct } from 'effect'
import { Activity, DurableClock, Workflow } from 'effect/workflow'
import { DoiSchema } from '../../../../types/Doi.ts'
import { Temporal, Uuid } from '../../../../types/index.ts'
import * as Errors from '../../Errors.ts'
import { CreateRecordOnZenodo } from './CreateRecordOnZenodo.ts'
import { PublishRecordOnZenodo } from './PublishRecordOnZenodo.ts'
import { RecordAssignedDoi } from './RecordAssignedDoi.ts'
import { RecordPublication } from './RecordPublication.ts'

export const PublishCommentRecord = Workflow.make('PublishCommentRecord', {
  error: Errors.UnableToPublishComment,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const layer = PublishCommentRecord.toLayer(({ commentId }, executionId) =>
  Effect.gen(function* () {
    const { recordId, doi } = yield* pipe(
      Activity.make({
        name: 'CreateRecordOnZenodo',
        success: Schema.Struct({ recordId: Schema.Int, doi: DoiSchema }),
        error: PublishCommentRecord.errorSchema,
        execute: CreateRecordOnZenodo(commentId),
      }),
      retryWithBackoff(executionId, 'CreateRecordOnZenodo'),
    )

    yield* pipe(
      Activity.make({
        name: 'RecordAssignedDoi',
        error: PublishCommentRecord.errorSchema,
        execute: RecordAssignedDoi(commentId, doi, recordId),
      }),
      retryWithBackoff(executionId, 'RecordAssignedDoi'),
    )

    const publishedAt = yield* pipe(
      Activity.make({
        name: 'PublishRecordOnZenodo',
        success: Temporal.InstantSchema,
        error: PublishCommentRecord.errorSchema,
        execute: PublishRecordOnZenodo(recordId),
      }),
      retryWithBackoff(executionId, 'PublishRecordOnZenodo'),
    )

    yield* pipe(
      Activity.make({
        name: 'RecordPublication',
        error: PublishCommentRecord.errorSchema,
        execute: RecordPublication(commentId, publishedAt),
      }),
      retryWithBackoff(executionId, 'RecordPublication'),
    )
  }),
)

const retryWithBackoff =
  (executionId: string, name: string) =>
  <A, E, R>(activity: Effect.Effect<A, E, R>) =>
    pipe(
      Effect.gen(function* () {
        const currentAttempt = yield* Activity.CurrentAttempt

        if (currentAttempt === 1) {
          return
        }

        yield* DurableClock.sleep({
          name: `sleep-${executionId}-${name}-${currentAttempt}`,
          duration: Duration.min(
            Duration.times(Duration.minutes(10), Math.pow(2, currentAttempt - 2)),
            Duration.hours(12),
          ),
        })
      }),
      Effect.andThen(activity),
      Activity.retry({ times: 10 }),
    )
