import { Either } from 'effect'
import * as IsErrorFreeForm from '../../../src/WebApp/ReviewADatasetFlow/IsErrorFreeQuestion/IsErrorFreeForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/IsErrorFreeQuestion/IsErrorFreeQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.IsErrorFreeQuestion({
    datasetReviewId,
    form: new IsErrorFreeForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsErrorFreeQuestion({
    datasetReviewId,
    form: new IsErrorFreeForm.CompletedForm({
      isErrorFree: 'yes',
      isErrorFreeYesDetail: NonEmptyString.fromString('Detail about the yes.'),
      isErrorFreePartlyDetail: NonEmptyString.fromString('Detail about the partly.'),
      isErrorFreeNoDetail: NonEmptyString.fromString('Detail about the no.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.IsErrorFreeQuestion({
    datasetReviewId,
    form: new IsErrorFreeForm.InvalidForm({
      isErrorFree: Either.left(new IsErrorFreeForm.Missing()),
      isErrorFreeYesDetail: Either.right(NonEmptyString.fromString('Detail about the yes.')),
      isErrorFreePartlyDetail: Either.right(NonEmptyString.fromString('Detail about the partly.')),
      isErrorFreeNoDetail: Either.right(NonEmptyString.fromString('Detail about the no.')),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
