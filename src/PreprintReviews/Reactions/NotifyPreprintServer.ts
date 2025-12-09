import { Effect } from 'effect'
import * as FeatureFlags from '../../FeatureFlags.ts'
import * as Errors from '../Errors.ts'

export const NotifyPreprintServer = Effect.fn(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function* (reviewId: number) {
    const sendCoarNotifyMessages = yield* FeatureFlags.sendCoarNotifyMessages

    if (sendCoarNotifyMessages === false) {
      return
    }

    return yield* Effect.fail('not implemented')
  },
  Effect.catchAll(error => new Errors.FailedToNotifyPreprintServer({ cause: error })),
)
