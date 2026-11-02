import { Array, Context, Effect, Layer, Option, pipe, PubSub, Ref, Schedule, Semaphore } from 'effect'
import * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'

type Subscriber = (events: Array.NonEmptyReadonlyArray<Events.Event>) => Effect.Effect<void>

class LastKnownPosition extends Context.Service<LastKnownPosition, Ref.Ref<Option.Option<EventStore.Position>>>()(
  'EventDispatcher/LastKnownPosition',
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

  yield* Effect.forEach(allSubscribers, subscriber => subscriber(newEvents), {
    discard: true,
    concurrency: 'unbounded',
  })
})

export const worker = Layer.effectDiscard(
  Effect.acquireRelease(
    Effect.gen(function* () {
      const events = yield* Events.Events
      const dequeue = yield* PubSub.subscribe(events)

      const mutex = yield* Semaphore.make(1)

      const safelyDispatchNewEvents = mutex.withPermits(1)(dispatchNewEvents)

      yield* pipe(
        safelyDispatchNewEvents,
        Effect.catch(error => Effect.annotateLogs(Effect.logError('DispatchNewEvents on timer failed'), { error })),
        Effect.repeat(Schedule.fixed('2 seconds')),
        Effect.forkScoped,
      )

      yield* pipe(
        PubSub.take(dequeue),
        Effect.andThen(safelyDispatchNewEvents),
        Effect.catch(error => Effect.annotateLogs(Effect.logError('DispatchNewEvents failed'), { error })),
        Effect.scoped,
        Effect.forever,
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
  Effect.andThen(dispatchNewEvents),
  Effect.timeout('20 seconds'),
  Effect.tap(() => Effect.logDebug('Existing events replayed')),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Unable to replay existing events'), { error })),
)
