import { DefaultLocale } from '../src/locales/index.js'
import { partners } from '../src/partners.js'
import { expect, test } from './base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(partners(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
