import { DefaultLocale } from '../../src/locales/index.ts'
import { createPage } from '../../src/WebApp/PartnersPage/PartnersPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }, testInfo) => {
  const content = await showPage(createPage(DefaultLocale))

  testInfo.fixme(testInfo.project.name === 'iPhone 11 Visual Regression')

  await expect(content).toHaveScreenshot()
})
