import { createPage } from '../../src/my-details-page/change-avatar-form-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
