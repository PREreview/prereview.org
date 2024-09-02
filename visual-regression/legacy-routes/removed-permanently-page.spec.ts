import { removedPermanentlyPage } from '../../src/legacy-routes/removed-permanently-page.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedPermanentlyPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
