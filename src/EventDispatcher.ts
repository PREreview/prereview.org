import { Array, Console, Effect, Layer, Schedule } from 'effect'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'

let numberOfKnownEvents = 0

const dispatchNewEvents = Effect.gen(function* () {
  const events = yield* EventStore.all

  if (events.length <= numberOfKnownEvents) {
    return
  }

  const slice = Array.takeRight(events, events.length - numberOfKnownEvents)

  numberOfKnownEvents = events.length

  yield* Console.log(`Found ${slice.length} new event${slice.length > 1 ? 's' : ''}`)
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)
