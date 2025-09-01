import { Either } from 'effect'
import * as RateTheQualityForm from '../../../src/ReviewADatasetFlow/RateTheQualityQuestion/RateTheQualityForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/RateTheQualityQuestion/RateTheQualityQuestion.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.RateTheQualityQuestion({
    datasetReviewId,
    form: new RateTheQualityForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.RateTheQualityQuestion({
    datasetReviewId,
    form: new RateTheQualityForm.CompletedForm({
      qualityRating: 'excellent',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.RateTheQualityQuestion({
    datasetReviewId,
    form: new RateTheQualityForm.InvalidForm({
      qualityRating: Either.left(new RateTheQualityForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
