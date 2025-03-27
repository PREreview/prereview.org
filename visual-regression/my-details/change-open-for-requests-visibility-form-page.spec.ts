import { DefaultLocale } from '../../src/locales/index.js'
import { createFormPage } from '../../src/my-details-page/change-open-for-requests-visibility-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ locale: DefaultLocale, openForRequests: { value: true, visibility: 'public' } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
