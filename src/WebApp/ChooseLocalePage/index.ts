import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import { createChooseLocalePage } from './ChooseLocalePage.ts'

export const ChooseLocalePage = Effect.gen(function* () {
  const locale = yield* Locale

  return createChooseLocalePage({ locale })
})
