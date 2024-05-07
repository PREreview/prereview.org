import { createFormPage } from '../../src/my-details-page/change-open-for-requests-visibility-form-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ openForRequests: { value: true, visibility: 'public' } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
