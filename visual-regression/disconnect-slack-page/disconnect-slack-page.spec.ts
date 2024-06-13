import { disconnectSlackPage } from '../../src/disconnect-slack-page/disconnect-slack-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(disconnectSlackPage)

  await expect(content).toHaveScreenshot()
})
