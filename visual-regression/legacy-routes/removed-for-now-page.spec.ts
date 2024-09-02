import { removedForNowPage } from '../../src/legacy-routes/removed-for-now-page.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedForNowPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
