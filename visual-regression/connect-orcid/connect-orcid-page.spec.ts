import { connectOrcidPage } from '../../src/connect-orcid/connect-orcid-page.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectOrcidPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
