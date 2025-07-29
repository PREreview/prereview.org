import { Effect, Layer, Match, pipe, PubSub, Queue, type Scope } from 'effect'
import * as Events from '../../Events.js'

const makeDatasetReviewReactions: Effect.Effect<never, never, Events.Events | Scope.Scope> = Effect.gen(function* () {
  const events = yield* Events.Events
  const dequeue = yield* PubSub.subscribe(events)

  return yield* pipe(
    Queue.take(dequeue),
    Effect.andThen(
      pipe(
        Match.type<Events.Event>(),
        Match.orElse(() => Effect.void),
      ),
    ),
    Effect.scoped,
    Effect.forever,
  )
})

export const reactionsWorker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    pipe(Effect.logDebug('DatasetReviews worker started'), Effect.andThen(makeDatasetReviewReactions)),
    () => Effect.logDebug('DatasetReviews worker started'),
  ),
)
