import { DefaultLocale } from '../src/locales/index.js'
import { partners } from '../src/partners.js'
import { expect, test } from './base.js'

test('content looks right', async ({ showPage }, testInfo) => {
  const content = await showPage(partners(DefaultLocale))

  testInfo.fixme(testInfo.project.name === 'iPhone 11 Visual Regression')

  await expect(content).toHaveScreenshot()
})
