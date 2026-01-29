import { Console, Effect, Layer, Schedule } from 'effect'
import * as FeatureFlags from './FeatureFlags.ts'

export const worker = Layer.effectDiscard(
  Effect.if(FeatureFlags.enableCoarNotifyInbox, {
    onTrue: () => Effect.repeat(Console.log('hello'), Schedule.fixed('2 seconds')),
    onFalse: () => Effect.void,
  }),
)
