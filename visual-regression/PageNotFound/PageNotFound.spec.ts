import { DefaultLocale } from '../../src/locales/index.js'
import { createPageNotFound } from '../../src/PageNotFound/PageNotFound.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createPageNotFound(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
