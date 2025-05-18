import { Effect } from 'effect'
import { Locale } from '../Context.js'
import { FeatureFlags } from '../feature-flags.js'
import { PageNotFound } from '../PageNotFound/index.js'
import { createChooseLocalePage } from './ChooseLocalePage.js'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale
  const featureFlags = yield* FeatureFlags

  if (!featureFlags.canChooseLocale) {
    return yield* PageNotFound
  }

  return createChooseLocalePage({ locale })
})
