import { createChooseLocalePage } from '../../src/ChooseLocalePage/ChooseLocalePage.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createChooseLocalePage({ locale: DefaultLocale }))

  await expect(content).toHaveScreenshot()
})
