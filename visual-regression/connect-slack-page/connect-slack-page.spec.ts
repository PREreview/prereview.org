import { connectSlackPage } from '../../src/WebApp/connect-slack-page/connect-slack-page.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectSlackPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
