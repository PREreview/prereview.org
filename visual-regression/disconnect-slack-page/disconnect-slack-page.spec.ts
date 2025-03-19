import { disconnectSlackPage } from '../../src/disconnect-slack-page/disconnect-slack-page.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(disconnectSlackPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
