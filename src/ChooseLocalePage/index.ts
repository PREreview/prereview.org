import { Effect } from 'effect'
import { Locale } from '../Context.js'
import * as FeatureFlags from '../FeatureFlags.js'
import { PageNotFound } from '../PageNotFound/index.js'
import { createChooseLocalePage } from './ChooseLocalePage.js'

export const ChooseLocalePage = Effect.gen(function* () {
  yield* FeatureFlags.EnsureCanChooseLocale

  const locale = yield* Locale

  return createChooseLocalePage({ locale })
}).pipe(Effect.catchTag('CannotChooseLocale', () => PageNotFound))
