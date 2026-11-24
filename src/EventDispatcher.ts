import { Array, Context, Effect, Layer, Option, pipe, Ref, Schedule, Stream, Struct } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

type Subscriber = (events: Array.NonEmptyReadonlyArray<Events.Event>) => Effect.Effect<void>

class LastCursor extends Context.Service<LastCursor, Ref.Ref<Option.Option<EventStore.Cursor>>>()(
  'EventDispatcher/LastCursor',
) {}

class Subscribers extends Context.Service<Subscribers, Ref.Ref<ReadonlyArray<Subscriber>>>()(
  'EventDispatcher/Subscribers',
) {}

export class EventDispatcher extends Context.Service<
  EventDispatcher,
  {
    addSubscriber: (subscriber: Subscriber) => Effect.Effect<void>
  }
>()('EventDispatcher') {}

export const EventDispatcherLayer = Layer.mergeAll(
  Layer.provideMerge(
    Layer.effect(
      EventDispatcher,
      Effect.gen(function* () {
        const subscribers = yield* Subscribers

        return {
          addSubscriber: subscriber => Ref.update(subscribers, Array.append(subscriber)),
        }
      }),
    ),
    Layer.effect(Subscribers, Ref.make([] as ReadonlyArray<Subscriber>)),
  ),
  Layer.effect(LastCursor, Ref.make(Option.none())),
)

const dispatchPage = Effect.fn('EventDispatcher.dispatchPage')(function* (page: EventStore.Page) {
  const lastCursor = yield* LastCursor
  const subscribers = yield* Subscribers
  const allSubscribers = yield* Ref.get(subscribers)

  yield* Ref.set(lastCursor, Option.some(Array.lastNonEmpty(page).cursor))

  yield* Effect.forEach(allSubscribers, subscriber => subscriber(Array.map(page, Struct.get('event'))), {
    discard: true,
    concurrency: 'unbounded',
  })
})

const dispatchExistingEvents = Effect.gen(function* () {
  const lastCursor = yield* LastCursor

  yield* Stream.runForEach(
    Option.match(yield* Ref.get(lastCursor), {
      onNone: () => EventStore.all,
      onSome: EventStore.since,
    }),
    dispatchPage,
  )
}).pipe(Effect.withSpan('EventDispatcher.dispatchExistingEvents'))

const dispatchNewEvents = Effect.gen(function* () {
  const lastCursor = yield* LastCursor

  yield* Stream.runForEach(
    EventStore.subscribe({ after: Option.getOrUndefined(yield* Ref.get(lastCursor)) }),
    dispatchPage,
  )
})

export const worker = Layer.effectDiscard(
  Effect.acquireRelease(
    Effect.gen(function* () {
      yield* pipe(
        dispatchNewEvents,
        Effect.tapError(error => Effect.annotateLogs(Effect.logError('DispatchNewEvents failed'), { error })),
        Effect.retry(Schedule.spaced('2 seconds')),
        Effect.forkScoped,
      )

      yield* Effect.logDebug('EventDispatcher worker started')
    }),
    () => Effect.logDebug('EventDispatcher worker stopped'),
    { interruptible: true },
  ),
)

export const replayExistingEvents = pipe(
  Effect.logDebug('Replaying existing events'),
  Effect.andThen(dispatchExistingEvents),
  Effect.timeout('20 seconds'),
  Effect.tap(() => Effect.logDebug('Existing events replayed')),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to replay existing events'), { error })),
)
