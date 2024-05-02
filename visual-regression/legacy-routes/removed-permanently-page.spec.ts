import { removedPermanentlyPage } from '../../src/legacy-routes/removed-permanently-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedPermanentlyPage)

  await expect(content).toHaveScreenshot()
})
