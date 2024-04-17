import { publishedPage } from '../../src/request-review-flow/published-page/published-page'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(publishedPage)

  await expect(content).toHaveScreenshot()
})
