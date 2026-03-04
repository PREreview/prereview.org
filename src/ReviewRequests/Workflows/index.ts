import { Activity, DurableClock, Workflow } from '@effect/workflow'
import { Duration, Effect, Inspectable, Layer, pipe, Schema, Struct } from 'effect'
import * as Preprints from '../../Preprints/index.ts'
import { Temporal, Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import { AcknowledgeReviewRequest as executeAcknowledgeReviewRequest } from './AcknowledgeReviewRequest.ts'
import { CategorizeReviewRequest as executeCategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfReviewRequest } from './NotifyCommunitySlack.ts'
import { ProcessReceivedReviewRequest as executeProcessReceivedReviewRequest } from './ProcessReceivedReviewRequest.ts'

export const AcknowledgeReviewRequest = Workflow.make({
  name: 'AcknowledgeReviewRequest',
  error: Errors.FailedToAcknowledgeReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

export const CategorizeReviewRequest = Workflow.make({
  name: 'CategorizeReviewRequest',
  error: Errors.FailedToCategorizeReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

export const NotifyCommunitySlackOfReviewRequest = Workflow.make({
  name: 'NotifyCommunitySlackOfReviewRequest',
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

export const ProcessReceivedReviewRequest = Workflow.make({
  name: 'ProcessReceivedReviewRequest',
  error: Errors.FailedToProcessReceivedReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

export const workflowsLayer = Layer.mergeAll(
  AcknowledgeReviewRequest.toLayer(({ reviewRequestId }) =>
    Activity.make({
      name: AcknowledgeReviewRequest.name,
      error: AcknowledgeReviewRequest.errorSchema,
      execute: executeAcknowledgeReviewRequest(reviewRequestId),
    }),
  ),
  CategorizeReviewRequest.toLayer(({ reviewRequestId }, executionId) =>
    pipe(
      Effect.gen(function* () {
        const currentAttempt = yield* Activity.CurrentAttempt

        if (currentAttempt === 1) {
          return
        }

        yield* DurableClock.sleep({
          name: `sleep-${executionId}-${currentAttempt}`,
          duration: '1 hour',
        })
      }),
      Effect.andThen(
        Activity.make({
          name: CategorizeReviewRequest.name,
          error: CategorizeReviewRequest.errorSchema,
          execute: executeCategorizeReviewRequest(reviewRequestId),
        }),
      ),
      Activity.retry({ times: 48 }),
      Effect.tapError(error =>
        Effect.gen(function* () {
          const failedAt = yield* Temporal.currentInstant
          const failureMessage = Inspectable.toStringUnknown(error.cause)

          yield* pipe(
            Commands.recordFailureToCategorizeReviewRequest({ failedAt, failureMessage, reviewRequestId }),
            Effect.ignoreLogged,
          )
        }),
      ),
    ),
  ),
  NotifyCommunitySlackOfReviewRequest.toLayer(({ reviewRequestId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfReviewRequest.name,
      error: NotifyCommunitySlackOfReviewRequest.errorSchema,
      execute: executeNotifyCommunitySlackOfReviewRequest(reviewRequestId),
    }),
  ),
  ProcessReceivedReviewRequest.toLayer(({ reviewRequestId }, executionId) =>
    pipe(
      Effect.gen(function* () {
        const currentAttempt = yield* Activity.CurrentAttempt

        if (currentAttempt === 1) {
          return
        }

        yield* DurableClock.sleep({
          name: `sleep-${executionId}-${currentAttempt}`,
          duration: Duration.min(Duration.times('10 minutes', Math.pow(2, currentAttempt - 2)), '12 hours'),
        })
      }),
      Effect.andThen(
        Activity.make({
          name: ProcessReceivedReviewRequest.name,
          error: Schema.Union(ProcessReceivedReviewRequest.errorSchema, Preprints.PreprintIsNotFound),
          execute: executeProcessReceivedReviewRequest(reviewRequestId),
        }),
      ),
      Activity.retry({ times: 10 }),
      Effect.catchTag('PreprintIsNotFound', () =>
        Effect.gen(function* () {
          const rejectedAt = yield* Temporal.currentInstant

          yield* pipe(
            Commands.rejectReviewRequest({
              rejectedAt,
              reviewRequestId,
              reason: 'unknown-preprint',
            }),
            Effect.ignoreLogged,
          )
        }),
      ),
    ),
  ),
)
