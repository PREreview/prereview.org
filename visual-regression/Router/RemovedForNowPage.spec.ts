import { DefaultLocale } from '../../src/locales/index.js'
import { removedForNowPage } from '../../src/Router/RemovedForNowPage.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedForNowPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
