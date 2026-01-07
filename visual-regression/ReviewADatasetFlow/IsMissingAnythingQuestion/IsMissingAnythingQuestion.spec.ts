import * as IsMissingAnythingForm from '../../../src/WebApp/ReviewADatasetFlow/IsMissingAnythingQuestion/IsMissingAnythingForm.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/IsMissingAnythingQuestion/IsMissingAnythingQuestion.ts'
import { NonEmptyString, Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.IsMissingAnythingQuestion({
    datasetReviewId,
    form: new IsMissingAnythingForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsMissingAnythingQuestion({
    datasetReviewId,
    form: new IsMissingAnythingForm.CompletedForm({
      isMissingAnything: NonEmptyString.fromString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
