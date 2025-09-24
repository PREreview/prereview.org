import { accessDeniedMessage } from '../../src/connect-orcid/access-denied-message.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(accessDeniedMessage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
