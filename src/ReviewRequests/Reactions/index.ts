import { Activity, DurableClock, Workflow, type WorkflowEngine } from '@effect/workflow'
import { Effect, Inspectable, Layer, Match, pipe, PubSub, Queue, Struct, type Scope } from 'effect'
import * as Events from '../../Events.ts'
import { Temporal, Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import { CategorizeReviewRequest as executeCategorizeReviewRequest } from './CategorizeReviewRequest.ts'
import { NotifyCommunitySlack as executeNotifyCommunitySlackOfReviewRequest } from './NotifyCommunitySlack.ts'
import { ProcessReceivedReviewRequest as executeProcessReceivedReviewRequest } from './ProcessReceivedReviewRequest.ts'

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
              CategorizeReviewRequest.execute(event, { discard: true }),
              NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
            ],
            { concurrency: 'inherit' },
          ),
        ),
        Match.tag('ReviewRequestFromAPreprintServerWasImported', event =>
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
  CategorizeReviewRequest.toLayer(({ reviewRequestId }, executionId) =>
    pipe(
      Effect.gen(function* () {
        const currentAttempt = yield* Activity.CurrentAttempt

        if (currentAttempt === 1) {
          return
        }

        yield* DurableClock.sleep({
          name: `sleep-${executionId}`,
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
  ProcessReceivedReviewRequest.toLayer(({ reviewRequestId }) =>
    Activity.make({
      name: ProcessReceivedReviewRequest.name,
      error: ProcessReceivedReviewRequest.errorSchema,
      execute: executeProcessReceivedReviewRequest(reviewRequestId),
    }),
  ),
)

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('ReviewRequests worker started'), Effect.andThen(makeReviewRequestReactions)),
    () => Effect.logDebug('ReviewRequests worker stopped'),
  ),
).pipe(Layer.provide(workflowsLayer))
