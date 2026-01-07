import { DefaultLocale } from '../../src/locales/index.ts'
import { page } from '../../src/WebApp/my-details-page/remove-avatar-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(page(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
