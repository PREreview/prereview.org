import { createDatasetReviewsPage } from '../../src/DatasetReviewsPage/DatasetReviewsPage.js'
import { expect, test } from '../base.js'

test('content looks right when empty', async ({ showTwoUpPage }) => {
  const response = createDatasetReviewsPage()

  const [content, aside] = await showTwoUpPage(response)

  await expect(content).toHaveScreenshot()
  await expect(aside).toHaveScreenshot()
})
