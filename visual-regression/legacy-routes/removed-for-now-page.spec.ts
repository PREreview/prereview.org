import { removedForNowPage } from '../../src/legacy-routes/removed-for-now-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedForNowPage)

  await expect(content).toHaveScreenshot()
})
