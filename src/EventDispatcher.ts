import { Array, Context, Effect, Layer, Option, pipe, PubSub, Queue, Ref, Schedule } from 'effect'
import * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

type Subscriber = (events: Array.NonEmptyReadonlyArray<Events.Event>) => Effect.Effect<void>

class LastKnownPosition extends Context.Tag('EventDispatcher/LastKnownPosition')<
  LastKnownPosition,
  Ref.Ref<Option.Option<EventStore.Position>>
>() {}

class Subscribers extends Context.Tag('EventDispatcher/Subscribers')<
  Subscribers,
  Ref.Ref<ReadonlyArray<Subscriber>>
>() {}

export class EventDispatcher extends Context.Tag('EventDispatcher')<
  EventDispatcher,
  {
    addSubscriber: (subscriber: Subscriber) => Effect.Effect<void>
  }
>() {}

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
  Layer.effect(LastKnownPosition, Ref.make(Option.none())),
)

const dispatchNewEvents = Effect.gen(function* () {
  const lastKnownPosition = yield* LastKnownPosition
  const subscribers = yield* Subscribers

  const result = yield* Effect.andThen(
    Ref.get(lastKnownPosition),
    Option.match({
      onNone: () => EventStore.all,
      onSome: EventStore.since,
    }),
  )

  if (Option.isNone(result)) {
    return
  }

  const { events: newEvents, lastKnownPosition: newLastKnownPosition } = result.value

  const allSubscribers = yield* Ref.get(subscribers)

  yield* Ref.set(lastKnownPosition, Option.some(newLastKnownPosition))

  yield* Effect.forEach(allSubscribers, subscriber => subscriber(newEvents), { discard: true, concurrency: 'inherit' })
})

export const worker = Layer.scopedDiscard(
  Effect.acquireReleaseInterruptible(
    Effect.gen(function* () {
      const events = yield* Events.Events
      const dequeue = yield* PubSub.subscribe(events)

      const mutex = yield* Effect.makeSemaphore(1)

      const safelyDispatchNewEvents = mutex.withPermits(1)(dispatchNewEvents)

      yield* pipe(
        safelyDispatchNewEvents,
        Effect.catchAll(error => Effect.annotateLogs(Effect.logError('DispatchNewEvents on timer failed'), { error })),
        Effect.repeat(Schedule.fixed('2 seconds')),
        Effect.fork,
      )

      yield* pipe(
        Queue.take(dequeue),
        Effect.andThen(safelyDispatchNewEvents),
        Effect.catchAll(error => Effect.annotateLogs(Effect.logError('DispatchNewEvents failed'), { error })),
        Effect.scoped,
        Effect.forever,
        Effect.fork,
      )

      yield* Effect.logDebug('EventDispatcher worker started')
    }),
    () => Effect.logDebug('EventDispatcher worker stopped'),
  ),
)

export const replayExistingEvents = dispatchNewEvents
