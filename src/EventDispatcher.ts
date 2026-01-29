import { Console, Effect, Layer, Schedule } from 'effect'
import * as EventStore from './EventStore.ts'
import * as FeatureFlags from './FeatureFlags.ts'

const dispatchNewEvents = Effect.gen(function* () {
  const events = yield* EventStore.all
  yield* Console.log(`Found ${events.length} events`)
})

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)
