import { Array, Context, Effect, Layer, Option, pipe, Ref, Schedule, Stream, Struct } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

type Subscriber = (events: Array.NonEmptyReadonlyArray<Events.Event>) => Effect.Effect<void>

class LastCursor extends Context.Service<LastCursor, Ref.Ref<Option.Option<EventStore.Cursor>>>()(
  'StatefulQueries/LastCursor',
) {}

class Subscribers extends Context.Service<Subscribers, Ref.Ref<ReadonlyArray<Subscriber>>>()(
  'StatefulQueries/Subscribers',
) {}

export class StatefulQueries extends Context.Service<
  StatefulQueries,
  {
    register: (subscriber: Subscriber) => Effect.Effect<void>
  }
>()('StatefulQueries') {}

export const layer = Layer.mergeAll(
  Layer.provideMerge(
    Layer.effect(
      StatefulQueries,
      Effect.gen(function* () {
        const subscribers = yield* Subscribers

        return {
          register: subscriber => Ref.update(subscribers, Array.append(subscriber)),
        }
      }),
    ),
    Layer.effect(Subscribers, Ref.make([] as ReadonlyArray<Subscriber>)),
  ),
  Layer.effect(LastCursor, Ref.make(Option.none())),
)

const updateWithPage = Effect.fn('StatefulQueries.updateWithPage')(function* (page: EventStore.Page) {
  const lastCursor = yield* LastCursor
  const subscribers = yield* Subscribers
  const allSubscribers = yield* Ref.get(subscribers)
  const events = Array.map(page, Struct.get('event'))

  yield* Effect.forEach(
    allSubscribers,
    subscriber =>
      Effect.catchDefect(subscriber(events), defect =>
        pipe(
          Ref.update(
            subscribers,
            Array.filter(other => other !== subscriber),
          ),
          Effect.andThen(
            Effect.annotateLogs(Effect.logError('Stateful query failed to update, so no longer updating it'), {
              defect,
            }),
          ),
        ),
      ),
    { discard: true, concurrency: 'unbounded' },
  )

  yield* Ref.set(lastCursor, Option.some(Array.lastNonEmpty(page).cursor))
})

const updateWithExistingEvents = Effect.gen(function* () {
  const lastCursor = yield* LastCursor

  yield* Stream.runForEach(
    Option.match(yield* Ref.get(lastCursor), {
      onNone: () => EventStore.all,
      onSome: EventStore.since,
    }),
    updateWithPage,
  )
}).pipe(Effect.withSpan('StatefulQueries.replay'))

const updateWithNewEvents = Effect.gen(function* () {
  const lastCursor = yield* LastCursor

  yield* Stream.runForEach(
    EventStore.subscribe({ after: Option.getOrUndefined(yield* Ref.get(lastCursor)) }),
    updateWithPage,
  )
})

export const worker = Layer.effectDiscard(
  Effect.acquireRelease(
    Effect.gen(function* () {
      yield* pipe(
        updateWithNewEvents,
        Effect.tapError(error =>
          Effect.annotateLogs(Effect.logError('Unable to update stateful queries with new events'), { error }),
        ),
        Effect.retry(Schedule.spaced('2 seconds')),
        Effect.forkScoped,
      )

      yield* Effect.logDebug('StatefulQueries worker started')
    }),
    () => Effect.logDebug('StatefulQueries worker stopped'),
    { interruptible: true },
  ),
)

export const replay = pipe(
  Effect.logDebug('Replaying existing events'),
  Effect.andThen(updateWithExistingEvents),
  Effect.timeout('20 seconds'),
  Effect.tap(() => Effect.logDebug('Existing events replayed')),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to replay existing events'), { error })),
)
