import { connectFailureMessage } from '../../src/connect-orcid/failure-message'
import { expect, test } from '../base'

test('content looks right when failing to connect', async ({ showPage }) => {
  const content = await showPage(connectFailureMessage)

  await expect(content).toHaveScreenshot()
})
