import { createHavingProblemsPage } from '../../src/HavingProblemsPage/HavingProblemsPage.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createHavingProblemsPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
