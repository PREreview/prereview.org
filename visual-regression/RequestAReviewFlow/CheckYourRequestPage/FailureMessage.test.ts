import { DefaultLocale } from '../../../src/locales/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/CheckYourRequestPage/FailureMessage.ts'
import { expect, test } from '../../base.ts'

const locale = DefaultLocale

test("content looks right when the change can't be made", async ({ showPage }) => {
  const content = await showPage(_.FailureMessage(locale))

  await expect(content).toHaveScreenshot()
})
