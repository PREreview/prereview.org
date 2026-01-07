import { createHavingProblemsPage } from '../../src/WebApp/HavingProblemsPage/HavingProblemsPage.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createHavingProblemsPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
