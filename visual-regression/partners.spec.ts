import { DefaultLocale } from '../src/locales/index.ts'
import { partners } from '../src/partners.ts'
import { expect, test } from './base.ts'

test('content looks right', async ({ showPage }, testInfo) => {
  const content = await showPage(partners(DefaultLocale))

  testInfo.fixme(testInfo.project.name === 'iPhone 11 Visual Regression')

  await expect(content).toHaveScreenshot()
})
