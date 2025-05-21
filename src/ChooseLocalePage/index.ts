import { Effect } from 'effect'
import { Locale } from '../Context.js'
import * as FeatureFlags from '../FeatureFlags.js'
import { PageNotFound } from '../PageNotFound/index.js'
import { createChooseLocalePage } from './ChooseLocalePage.js'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale

  if (!(yield* FeatureFlags.canChooseLocale)) {
    return yield* PageNotFound
  }

  return createChooseLocalePage({ locale })
})
