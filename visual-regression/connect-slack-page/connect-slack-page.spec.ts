import { connectSlackPage } from '../../src/connect-slack-page/connect-slack-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(connectSlackPage)

  await expect(content).toHaveScreenshot()
})
