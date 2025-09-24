import { DefaultLocale } from '../../src/locales/index.ts'
import { removedPermanentlyPage } from '../../src/Router/RemovedPermanentlyPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(removedPermanentlyPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
