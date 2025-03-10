import { accessDeniedMessage } from '../../src/connect-orcid/access-denied-message.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
