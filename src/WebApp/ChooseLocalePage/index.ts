import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import { UserSelectableLocales } from '../../locales/index.ts'
import { createChooseLocalePage } from './ChooseLocalePage.ts'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale
  const enabledLocales = UserSelectableLocales

  return createChooseLocalePage({ locale, enabledLocales })
})
