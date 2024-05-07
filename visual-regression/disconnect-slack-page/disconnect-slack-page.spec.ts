import { disconnectSlackPage } from '../../src/disconnect-slack-page/disconnect-slack-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(disconnectSlackPage)

  await expect(content).toHaveScreenshot()
})
