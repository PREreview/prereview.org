import { Option } from 'effect'
import * as IsMissingAnythingForm from '../../../src/ReviewADatasetFlow/IsMissingAnythingQuestion/IsMissingAnythingForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/IsMissingAnythingQuestion/IsMissingAnythingQuestion.js'
import { NonEmptyString, Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

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
      isMissingAnything: Option.some(
        NonEmptyString.NonEmptyString('Lorem ipsum dolor sit amet, consectetur adipiscing elit.'),
      ),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
