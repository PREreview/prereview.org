import { Either } from 'effect'
import * as HasEnoughMetadataForm from '../../../src/ReviewADatasetFlow/HasEnoughMetadataQuestion/HasEnoughMetadataForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/HasEnoughMetadataQuestion/HasEnoughMetadataQuestion.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

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
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
