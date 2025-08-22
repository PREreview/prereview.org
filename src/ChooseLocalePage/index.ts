import { Effect } from 'effect'
import { Locale } from '../Context.js'
import { createChooseLocalePage } from './ChooseLocalePage.js'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale

  return createChooseLocalePage({ locale })
})
