import { removedPermanentlyPage } from '../../src/legacy-routes/removed-permanently-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedPermanentlyPage)

  await expect(content).toHaveScreenshot()
})
