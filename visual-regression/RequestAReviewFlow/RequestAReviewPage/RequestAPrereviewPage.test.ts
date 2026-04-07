import { Either } from 'effect'
import { DefaultLocale } from '../../../src/locales/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/RequestAPrereviewPage.ts'
import * as RequestAReviewForm from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewPage/RequestAReviewForm.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.RequestAPrereviewPage(new RequestAReviewForm.EmptyForm(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when invalid', async ({ showPage }) => {
  const response = _.RequestAPrereviewPage(
    new RequestAReviewForm.InvalidForm({
      whichPreprint: Either.left(new RequestAReviewForm.Invalid({ value: 'not-a-preprint' })),
    }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
