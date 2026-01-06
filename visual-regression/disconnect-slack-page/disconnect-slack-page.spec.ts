import { disconnectSlackPage } from '../../src/WebApp/disconnect-slack-page/disconnect-slack-page.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(disconnectSlackPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
