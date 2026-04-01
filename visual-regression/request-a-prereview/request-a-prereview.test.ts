import { Either } from 'effect'
import { DefaultLocale } from '../../src/locales/index.ts'
import { requestAPrereviewPage } from '../../src/WebApp/request-a-prereview-page/request-a-prereview-page.ts'
import * as RequestAReviewForm from '../../src/WebApp/request-a-prereview-page/RequestAReviewForm.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = requestAPrereviewPage(new RequestAReviewForm.EmptyForm(), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when invalid', async ({ showPage }) => {
  const response = requestAPrereviewPage(
    new RequestAReviewForm.InvalidForm({
      whichPreprint: Either.left(new RequestAReviewForm.Invalid({ value: 'not-a-preprint' })),
    }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
