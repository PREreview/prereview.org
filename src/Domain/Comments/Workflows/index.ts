import { Duration, Effect, Layer, pipe, Schema, Struct } from 'effect'
import { Activity, DurableClock, Workflow } from 'effect/workflow'
import { DoiSchema } from '../../../types/Doi.ts'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { CreateRecordOnZenodo, RecordAssignedDoi } from './AssignADoi.ts'
import { CheckIfUserHasAVerifiedEmailAddress as executeCheckIfUserHasAVerifiedEmailAddress } from './CheckIfUserHasAVerifiedEmailAddress.ts'
import { PublishComment as executePublishComment } from './PublishComment.ts'

export const AssignCommentADoi = Workflow.make('AssignCommentADoi', {
  error: Errors.UnableToAssignADoi,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const CheckIfUserHasAVerifiedEmailAddress = Workflow.make('CheckIfUserHasAVerifiedEmailAddress', {
  error: Errors.UnableToCheckForAVerifiedEmailAddress,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const PublishComment = Workflow.make('PublishComment', {
  error: Errors.UnableToPublishComment,
  payload: {
    commentId: Uuid.UuidSchema,
    id: Schema.Number,
  },
  idempotencyKey: Struct.get('commentId'),
})

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

export const workflowsLayer = Layer.mergeAll(
  AssignCommentADoi.toLayer(({ commentId }, executionId) =>
    Effect.gen(function* () {
      const [doi, id] = yield* pipe(
        Activity.make({
          name: 'CreateRecordOnZenodo',
          success: Schema.Tuple([DoiSchema, Schema.Number]),
          error: AssignCommentADoi.errorSchema,
          execute: CreateRecordOnZenodo(commentId),
        }),
        retryWithBackoff(executionId, 'CreateRecordOnZenodo'),
      )

      yield* pipe(
        Activity.make({
          name: 'RecordAssignedDoi',
          error: AssignCommentADoi.errorSchema,
          execute: RecordAssignedDoi(commentId, doi, id),
        }),
        retryWithBackoff(executionId, 'RecordAssignedDoi'),
      )
    }),
  ),
  CheckIfUserHasAVerifiedEmailAddress.toLayer(({ commentId }) =>
    Activity.make({
      name: CheckIfUserHasAVerifiedEmailAddress._tag,
      error: CheckIfUserHasAVerifiedEmailAddress.errorSchema,
      execute: executeCheckIfUserHasAVerifiedEmailAddress(commentId),
    }),
  ),
  PublishComment.toLayer(({ commentId, id }) =>
    Activity.make({
      name: PublishComment._tag,
      error: PublishComment.errorSchema,
      execute: executePublishComment(commentId, id),
    }),
  ),
)
