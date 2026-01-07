import { Either } from 'effect'
import * as HasEnoughMetadataForm from '../../../src/WebApp/ReviewADatasetFlow/HasEnoughMetadataQuestion/HasEnoughMetadataForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/HasEnoughMetadataQuestion/HasEnoughMetadataQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.HasEnoughMetadataQuestion({
    datasetReviewId,
    form: new HasEnoughMetadataForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.HasEnoughMetadataQuestion({
    datasetReviewId,
    form: new HasEnoughMetadataForm.CompletedForm({
      hasEnoughMetadata: 'yes',
      hasEnoughMetadataYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      hasEnoughMetadataPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      hasEnoughMetadataNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.HasEnoughMetadataQuestion({
    datasetReviewId,
    form: new HasEnoughMetadataForm.InvalidForm({
      hasEnoughMetadata: Either.left(new HasEnoughMetadataForm.Missing()),
      hasEnoughMetadataYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      hasEnoughMetadataPartlyDetail: Either.right(NonEmptyString.fromString('Detail about the partly.')),
      hasEnoughMetadataNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
