import { Activity, Workflow, type WorkflowEngine } from '@effect/workflow'
import { Effect, Layer, Match, pipe, PubSub, Queue, Struct, type Scope } from 'effect'
import * as Events from '../../Events.ts'
import { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

const NotifyCommunitySlackOfReviewRequest = Workflow.make({
  name: 'NotifyCommunitySlackOfReviewRequest',
  error: Errors.FailedToNotifyCommunitySlack,
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
          NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

const workflowsLayer = Layer.mergeAll(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  NotifyCommunitySlackOfReviewRequest.toLayer(({ reviewRequestId }) =>
    Activity.make({
      name: NotifyCommunitySlackOfReviewRequest.name,
      error: NotifyCommunitySlackOfReviewRequest.errorSchema,
      execute: new Errors.FailedToNotifyCommunitySlack({ cause: 'not implemented' }),
    }),
  ),
)

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('ReviewRequests worker started'), Effect.andThen(makeReviewRequestReactions)),
    () => Effect.logDebug('ReviewRequests worker stopped'),
  ),
).pipe(Layer.provide(workflowsLayer))
