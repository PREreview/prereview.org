import { DefaultLocale } from '../../src/locales/index.ts'
import { createFormPage } from '../../src/my-details-page/change-open-for-requests-visibility-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ locale: DefaultLocale, openForRequests: { value: true, visibility: 'public' } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
