import { DefaultLocale } from '../../src/locales/index.ts'
import * as _ from '../../src/WebApp/MyReviewRequestsPage/NoReviewRequestsPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.NoReviewRequestsPage({ locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale
