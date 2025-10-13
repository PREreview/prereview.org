import { Either } from 'effect'
import * as HasDataCensoredOrDeletedForm from '../../../src/ReviewADatasetFlow/HasDataCensoredOrDeletedQuestion/HasDataCensoredOrDeletedForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/HasDataCensoredOrDeletedQuestion/HasDataCensoredOrDeletedQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.HasDataCensoredOrDeletedQuestion({
    datasetReviewId,
    form: new HasDataCensoredOrDeletedForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.HasDataCensoredOrDeletedQuestion({
    datasetReviewId,
    form: new HasDataCensoredOrDeletedForm.CompletedForm({
      hasDataCensoredOrDeleted: 'yes',
      hasDataCensoredOrDeletedYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      hasDataCensoredOrDeletedPartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      hasDataCensoredOrDeletedNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.HasDataCensoredOrDeletedQuestion({
    datasetReviewId,
    form: new HasDataCensoredOrDeletedForm.InvalidForm({
      hasDataCensoredOrDeleted: Either.left(new HasDataCensoredOrDeletedForm.Missing()),
      hasDataCensoredOrDeletedYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      hasDataCensoredOrDeletedPartlyDetail: Either.right(NonEmptyString.fromString('Detail about the partly.')),
      hasDataCensoredOrDeletedNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
