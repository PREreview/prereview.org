import { Array, Console, Context, Effect, Layer, PubSub, Schedule, flow, pipe } from 'effect'
import type * as Events from './Events.ts'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'

let numberOfKnownEvents = 0

type Subscriber = (event: Events.Event) => void

export class EventDispatcher extends Context.Tag('EventDispatcher')<
  EventDispatcher,
  {
    addSubscriber: (subscriber: Subscriber) => Effect.Effect<void>
  }
>() {}

export const EventDispatcherLayer = Layer.succeed(EventDispatcher, {
  addSubscriber: () => Effect.void,
})

export class EventsForQueries extends Context.Tag('EventsForQueries')<
  EventsForQueries,
  PubSub.PubSub<Events.Event>
>() {}

export const EventsForQueriesLayer = Layer.scoped(
  EventsForQueries,
  Effect.acquireRelease(
    pipe(PubSub.bounded<Events.Event>(100), Effect.tap(Effect.logDebug('EventsForQueries started'))),
    flow(PubSub.shutdown, Effect.tap(Effect.logDebug('EventsForQueries stopped'))),
  ),
)

const dispatchNewEvents = Effect.gen(function* () {
  const events = yield* EventStore.all

  if (events.length <= numberOfKnownEvents) {
    return
  }

  const newEvents = Array.takeRight(events, events.length - numberOfKnownEvents)

  numberOfKnownEvents = events.length

  yield* Console.log(`Found ${newEvents.length} new event${newEvents.length > 1 ? 's' : ''}`)
  yield* PubSub.publishAll(yield* EventsForQueries, newEvents)
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)
