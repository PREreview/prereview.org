import { DefaultLocale } from '../../src/locales/index.ts'
import { createPageNotFound } from '../../src/PageNotFound/PageNotFound.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createPageNotFound(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
