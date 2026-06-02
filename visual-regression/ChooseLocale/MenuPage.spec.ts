import { HashSet } from 'effect'
import { createChooseLocalePage } from '../../src/WebApp/ChooseLocalePage/ChooseLocalePage.ts'
import { DefaultLocale, type UserSelectableLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(
    createChooseLocalePage({
      locale: DefaultLocale,
      enabledLocales: HashSet.make<ReadonlyArray<UserSelectableLocale>>('en-US', 'es-419', 'pt-BR'),
    }),
  )

  await expect(content).toHaveScreenshot()
})
