import type { WorkflowEngine } from '@effect/workflow'
import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../Events.ts'
import * as Workflows from './Workflows/index.ts'

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
        Match.tag('ReviewRequestForAPreprintWasPublished', event =>
          Effect.all(
            [
              Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
              Workflows.NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
            ],
            { concurrency: 'inherit' },
          ),
        ),
        Match.tag('ReviewRequestForAPreprintWasAccepted', event =>
          Effect.all(
            [
              Workflows.AcknowledgeReviewRequest.execute(event, { discard: true }),
              Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
              Workflows.NotifyCommunitySlackOfReviewRequest.execute(event, { discard: true }),
            ],
            { concurrency: 'inherit' },
          ),
        ),
        Match.tag('ReviewRequestByAPrereviewerWasImported', 'ReviewRequestFromAPreprintServerWasImported', event =>
          Workflows.CategorizeReviewRequest.execute(event, { discard: true }),
        ),
        Match.tag('ReviewRequestForAPreprintWasReceived', event =>
          Workflows.ProcessReceivedReviewRequest.execute(event, { discard: true }),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('ReviewRequests worker started'), Effect.andThen(makeReviewRequestReactions)),
    () => Effect.logDebug('ReviewRequests worker stopped'),
  ),
)
