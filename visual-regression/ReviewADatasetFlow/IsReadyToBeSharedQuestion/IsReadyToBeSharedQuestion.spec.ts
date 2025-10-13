import { Either } from 'effect'
import * as IsReadyToBeSharedForm from '../../../src/ReviewADatasetFlow/IsReadyToBeSharedQuestion/IsReadyToBeSharedForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/IsReadyToBeSharedQuestion/IsReadyToBeSharedQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.IsReadyToBeSharedQuestion({
    datasetReviewId,
    form: new IsReadyToBeSharedForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsReadyToBeSharedQuestion({
    datasetReviewId,
    form: new IsReadyToBeSharedForm.CompletedForm({
      isReadyToBeShared: 'yes',
      isReadyToBeSharedYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      isReadyToBeSharedNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.IsReadyToBeSharedQuestion({
    datasetReviewId,
    form: new IsReadyToBeSharedForm.InvalidForm({
      isReadyToBeShared: Either.left(new IsReadyToBeSharedForm.Missing()),
      isReadyToBeSharedYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      isReadyToBeSharedNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
