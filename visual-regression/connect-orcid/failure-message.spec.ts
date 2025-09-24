import { connectFailureMessage, disconnectFailureMessage } from '../../src/connect-orcid/failure-message.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right when failing to connect', async ({ showPage }) => {
  const content = await showPage(connectFailureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})

test('content looks right when failing to disconnect', async ({ showPage }) => {
  const content = await showPage(disconnectFailureMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
