import { Array, Context, Effect, Layer, Option, Schedule } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'

type Subscriber = (event: Events.Event) => void

let lastKnownPosition = Option.none<EventStore.Position>()
const subscribers: Array<Subscriber> = []

export class EventDispatcher extends Context.Tag('EventDispatcher')<
  EventDispatcher,
  {
    addSubscriber: (subscriber: Subscriber) => Effect.Effect<void>
  }
>() {}

export const EventDispatcherLayer = Layer.succeed(EventDispatcher, {
  addSubscriber: subscriber => Effect.sync(() => subscribers.push(subscriber)),
})

const dispatchNewEvents = Effect.gen(function* () {
  const result = yield* Option.match(lastKnownPosition, { onNone: () => EventStore.all, onSome: EventStore.since })

  if (Option.isNone(result)) {
    return
  }

  const { events: newEvents, lastKnownPosition: newLastKnownPosition } = result.value

  lastKnownPosition = Option.some(newLastKnownPosition)

  yield* Effect.forEach(
    Array.chunksOf(newEvents, 100),
    events =>
      Effect.sync(() => Array.forEach(events, event => Array.forEach(subscribers, subscriber => subscriber(event)))),
    { discard: true },
  )
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)

export const replayExistingEvents = dispatchNewEvents
