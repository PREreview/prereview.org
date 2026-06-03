import type { WorkflowEngine } from '@effect/workflow'
import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../Events.ts'
import * as Workflows from './Workflows/index.ts'

const makeAuthorInvitesReactions: Effect.Effect<
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
        Match.tag('DatasetReviewWasPublished', event =>
          Workflows.SendAuthorInviteEmails.execute({ reviewId: event.datasetReviewId }, { discard: true }),
        ),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.forever,
  )
})

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('AuthorInvites worker started'), Effect.andThen(makeAuthorInvitesReactions)),
    () => Effect.logDebug('AuthorInvites worker stopped'),
  ),
)
