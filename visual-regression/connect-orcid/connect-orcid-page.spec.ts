import { connectOrcidPage } from '../../src/connect-orcid/connect-orcid-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectOrcidPage)

  await expect(content).toHaveScreenshot()
})
