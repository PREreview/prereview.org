import { connectOrcidPage } from '../../src/WebApp/connect-orcid/connect-orcid-page.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectOrcidPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
