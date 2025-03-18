import { DefaultLocale } from '../../src/locales/index.js'
import { accessDeniedMessage } from '../../src/log-in/access-denied-message.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
