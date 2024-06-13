import { connectFailureMessage, disconnectFailureMessage } from '../../src/connect-orcid/failure-message.js'
import { expect, test } from '../base.js'

test('content looks right when failing to connect', async ({ showPage }) => {
  const content = await showPage(connectFailureMessage)

  await expect(content).toHaveScreenshot()
})

test('content looks right when failing to disconnect', async ({ showPage }) => {
  const content = await showPage(disconnectFailureMessage)

  await expect(content).toHaveScreenshot()
})
