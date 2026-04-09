import * as _ from '../../src/WebApp/MyReviewRequestsPage/NoReviewRequestsPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.NoReviewRequestsPage()

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
