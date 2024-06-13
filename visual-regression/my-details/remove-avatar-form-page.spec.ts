import { page } from '../../src/my-details-page/remove-avatar-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(page)

  await expect(content).toHaveScreenshot()
})
