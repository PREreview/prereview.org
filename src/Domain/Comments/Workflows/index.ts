import { Duration, Effect, Layer, pipe, Struct } from 'effect'
import { Activity, DurableClock, Workflow } from 'effect/workflow'
import { Uuid } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import { CheckIfUserHasAVerifiedEmailAddress as executeCheckIfUserHasAVerifiedEmailAddress } from './CheckIfUserHasAVerifiedEmailAddress.ts'
import * as PublishCommentRecord from './PublishCommentRecord/index.ts'
import { WithdrawOnZenodo } from './WithdrawCommentOnZenodo.ts'

export { PublishCommentRecord } from './PublishCommentRecord/index.ts'

export const CheckIfUserHasAVerifiedEmailAddress = Workflow.make('CheckIfUserHasAVerifiedEmailAddress', {
  error: Errors.UnableToCheckForAVerifiedEmailAddress,
  payload: {
    commentId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('commentId'),
})

export const WithdrawCommentOnZenodo = Workflow.make('WithdrawCommentOnZenodo', {
  error: Errors.UnableToWithdrawCommentOnZenodo,
  payload: {
    commentId: Uuid.UuidSchema,
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
  PublishCommentRecord.layer,
  CheckIfUserHasAVerifiedEmailAddress.toLayer(({ commentId }, executionId) =>
    pipe(
      Activity.make({
        name: CheckIfUserHasAVerifiedEmailAddress._tag,
        error: CheckIfUserHasAVerifiedEmailAddress.errorSchema,
        execute: executeCheckIfUserHasAVerifiedEmailAddress(commentId),
      }),
      retryWithBackoff(executionId, CheckIfUserHasAVerifiedEmailAddress._tag),
    ),
  ),
  WithdrawCommentOnZenodo.toLayer(({ commentId }, executionId) =>
    pipe(
      Activity.make({
        name: 'WithdrawOnZenodo',
        error: WithdrawCommentOnZenodo.errorSchema,
        execute: WithdrawOnZenodo(commentId),
      }),
      retryWithBackoff(executionId, 'WithdrawOnZenodo'),
    ),
  ),
)
