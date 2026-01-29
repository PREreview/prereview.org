import { Console, Effect, Layer, Schedule } from 'effect'
import * as FeatureFlags from './FeatureFlags.ts'

const dispatchNewEvents = Console.log('hello')

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(dispatchNewEvents, Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)
