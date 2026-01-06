import { createChooseLocalePage } from '../../src/WebApp/ChooseLocalePage/ChooseLocalePage.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createChooseLocalePage({ locale: DefaultLocale }))

  await expect(content).toHaveScreenshot()
})
