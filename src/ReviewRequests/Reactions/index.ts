import { Activity, DurableClock, Workflow, type WorkflowEngine } from '@effect/workflow'
import { Duration, Effect, Inspectable, Layer, Match, pipe, PubSub, Queue, Schema, Struct, type Scope } from 'effect'
import * as Events from '../../Events.ts'
import * as Preprints from '../../Preprints/index.ts'
import { Temporal, Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import { AcknowledgeReviewRequest as executeAcknowledgeReviewRequest } from './AcknowledgeReviewRequest.ts'
import { CategorizeReviewRequest as executeCategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfReviewRequest } from './NotifyCommunitySlack.ts'
import { ProcessReceivedReviewRequest as executeProcessReceivedReviewRequest } from './ProcessReceivedReviewRequest.ts'

const AcknowledgeReviewRequest = Workflow.make({
  name: 'AcknowledgeReviewRequest',
  error: Errors.FailedToAcknowledgeReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

const CategorizeReviewRequest = Workflow.make({
  name: 'CategorizeReviewRequest',
  error: Errors.FailedToCategorizeReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

const NotifyCommunitySlackOfReviewRequest = Workflow.make({
  name: 'NotifyCommunitySlackOfReviewRequest',
  error: Errors.FailedToNotifyCommunitySlack,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

const ProcessReceivedReviewRequest = Workflow.make({
  name: 'ProcessReceivedReviewRequest',
  error: Errors.FailedToProcessReceivedReviewRequest,
  payload: {
    reviewRequestId: Uuid.UuidSchema,
  },
  idempotencyKey: Struct.get('reviewRequestId'),
})

const makeReviewRequestReactions: Effect.Effect<
  never,
  never,
  Events.Events | Scope.Scope | WorkflowEngine.WorkflowEngine
> = Effect.gen(function* () {
  const events = yield* Events.Events
  const dequeue = yield* PubSub.subscribe(events)

  return yield* pipe(
    Queue.take(dequeue),
    Effect.andThen(
      pipe(
        Match.type<Events.Event>(),
        Match.tag('ReviewRequestForAPreprintWasAccepted', event =>
          Effect.all(
            [
              AcknowledgeReviewRequest.execute(event, { discard: true }),
              CategorizeReviewRequest.execute(event, { discard: true }),
              NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
            ],
            { concurrency: 'inherit' },
          ),
        ),
        Match.tag('ReviewRequestByAPrereviewerWasImported', 'ReviewRequestFromAPreprintServerWasImported', event =>
          CategorizeReviewRequest.execute(event, { discard: true }),
        ),
        Match.tag('ReviewRequestForAPreprintWasReceived', event =>
          ProcessReceivedReviewRequest.execute(event, { discard: true }),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

const workflowsLayer = Layer.mergeAll(
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

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('ReviewRequests worker started'), Effect.andThen(makeReviewRequestReactions)),
    () => Effect.logDebug('ReviewRequests worker stopped'),
  ),
).pipe(Layer.provide(workflowsLayer))
