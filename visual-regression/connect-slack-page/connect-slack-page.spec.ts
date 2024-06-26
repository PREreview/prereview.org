import { connectSlackPage } from '../../src/connect-slack-page/connect-slack-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectSlackPage)

  await expect(content).toHaveScreenshot()
})
