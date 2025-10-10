import { Either } from 'effect'
import * as RateTheQualityForm from '../../../src/ReviewADatasetFlow/RateTheQualityQuestion/RateTheQualityForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/RateTheQualityQuestion/RateTheQualityQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

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
      qualityRatingExcellentDetail: NonEmptyString.fromString('Detail about the excellent rating.'),
      qualityRatingFairDetail: NonEmptyString.fromString('Detail about the fair rating.'),
      qualityRatingPoorDetail: NonEmptyString.fromString('Detail about the poor rating.'),
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
      qualityRatingExcellentDetail: Either.right(NonEmptyString.fromString('Detail about the excellent rating.')),
      qualityRatingFairDetail: Either.right(NonEmptyString.fromString('Detail about the fair rating.')),
      qualityRatingPoorDetail: Either.right(NonEmptyString.fromString('Detail about the poor rating.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
