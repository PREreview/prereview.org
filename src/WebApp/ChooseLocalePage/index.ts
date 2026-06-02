import { Effect } from 'effect'
import { EnabledLocales, Locale } from '../../Context.ts'
import { createChooseLocalePage } from './ChooseLocalePage.ts'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale
  const enabledLocales = yield* EnabledLocales

  return createChooseLocalePage({ locale, enabledLocales })
})
