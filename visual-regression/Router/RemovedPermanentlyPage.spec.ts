import { DefaultLocale } from '../../src/locales/index.js'
import { removedPermanentlyPage } from '../../src/Router/RemovedPermanentlyPage.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedPermanentlyPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
