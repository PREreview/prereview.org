import { Array, Context, Effect, Layer, Option, Schedule } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import type { Uuid } from './types/index.ts'

type Subscriber = (event: Events.Event) => void

let lastKnownEvent = Option.none<Uuid.Uuid>()
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
  const result = yield* Option.match(lastKnownEvent, { onNone: () => EventStore.all, onSome: EventStore.since })

  if (Option.isNone(result)) {
    return
  }

  const { events: newEvents, lastKnownEvent: newLastKnownEvent } = result.value

  lastKnownEvent = Option.some(newLastKnownEvent)

  Array.forEach(newEvents, event => Array.forEach(subscribers, subscriber => subscriber(event)))
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)

export const replayExistingEvents = dispatchNewEvents
