import { DefaultLocale } from '../../src/locales/index.js'
import { notAPreprintPage } from '../../src/request-a-prereview-page/not-a-preprint-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(notAPreprintPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
