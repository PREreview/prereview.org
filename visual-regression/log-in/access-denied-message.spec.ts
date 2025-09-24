import { DefaultLocale } from '../../src/locales/index.ts'
import { accessDeniedMessage } from '../../src/log-in/access-denied-message.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
