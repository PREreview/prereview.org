import { Either } from 'effect'
import * as OthersNeedToBeListedForm from '../../../src/WebApp/ReviewADatasetFlow/OthersNeedToBeListedOnTheReviewPage/OthersNeedToBeListedForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/OthersNeedToBeListedOnTheReviewPage/OthersNeedToBeListedPage.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.OthersNeedToBeListedPage({
    datasetReviewId,
    form: new OthersNeedToBeListedForm.EmptyForm(),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a choice', async ({ showPage }) => {
  const response = _.OthersNeedToBeListedPage({
    datasetReviewId,
    form: new OthersNeedToBeListedForm.CompletedForm({ othersNeedToBeListed: 'yes' }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the choice is missing', async ({ showPage }) => {
  const response = _.OthersNeedToBeListedPage({
    datasetReviewId,
    form: new OthersNeedToBeListedForm.InvalidForm({
      othersNeedToBeListed: Either.left(new OthersNeedToBeListedForm.Missing()),
    }),
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
