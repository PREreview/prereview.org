import { DefaultLocale } from '../../src/locales/index.ts'
import { removedForNowPage } from '../../src/WebApp/Router/RemovedForNowPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedForNowPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
