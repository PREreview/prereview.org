import { accessDeniedMessage } from '../../src/connect-orcid/access-denied-message'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage)

  await expect(content).toHaveScreenshot()
})
