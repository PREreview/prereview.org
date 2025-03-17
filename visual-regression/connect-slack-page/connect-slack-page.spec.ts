import { connectSlackPage } from '../../src/connect-slack-page/connect-slack-page.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectSlackPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
