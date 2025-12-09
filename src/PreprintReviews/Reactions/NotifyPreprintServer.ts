import { Effect } from 'effect'
import * as FeatureFlags from '../../FeatureFlags.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as Errors from '../Errors.ts'

export const NotifyPreprintServer = Effect.fn(
  function* (reviewId: number) {
    const sendCoarNotifyMessages = yield* FeatureFlags.sendCoarNotifyMessages

    if (sendCoarNotifyMessages === false) {
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const prereview = yield* Prereviews.getPrereview(reviewId)

    return yield* Effect.fail('not implemented')
  },
  Effect.catchAll(error => new Errors.FailedToNotifyPreprintServer({ cause: error })),
)
