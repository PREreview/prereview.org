import { requestReviewPage } from '../../src/request-review-flow/request-review-page/request-review-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(requestReviewPage)

  await expect(content).toHaveScreenshot()
})
