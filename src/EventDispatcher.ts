import { Array, Console, Context, Effect, Layer, Option, Schedule, Struct } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'

type Subscriber = (event: Events.Event) => void

let numberOfKnownEvents = 0
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
  const events = yield* Effect.andThen(
    EventStore.all,
    Option.match({ onNone: Array.empty, onSome: Struct.get('events') }),
  )

  if (events.length <= numberOfKnownEvents) {
    return
  }

  const newEvents = Array.takeRight(events, events.length - numberOfKnownEvents)

  numberOfKnownEvents = events.length

  yield* Console.log(`Found ${newEvents.length} new event${newEvents.length > 1 ? 's' : ''}`)
  yield* Console.log(`Subscriber count: ${subscribers.length}`)
  Array.forEach(newEvents, event => Array.forEach(subscribers, subscriber => subscriber(event)))
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)

export const replayExistingEvents = dispatchNewEvents
