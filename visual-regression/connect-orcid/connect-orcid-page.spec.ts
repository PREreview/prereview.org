import { connectOrcidPage } from '../../src/connect-orcid/connect-orcid-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectOrcidPage)

  await expect(content).toHaveScreenshot()
})
