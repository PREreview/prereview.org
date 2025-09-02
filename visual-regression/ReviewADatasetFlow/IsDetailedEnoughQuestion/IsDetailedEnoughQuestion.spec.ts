import { Either } from 'effect'
import * as IsDetailedEnoughForm from '../../../src/ReviewADatasetFlow/IsDetailedEnoughQuestion/IsDetailedEnoughForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/IsDetailedEnoughQuestion/IsDetailedEnoughQuestion.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.IsDetailedEnoughQuestion({
    datasetReviewId,
    form: new IsDetailedEnoughForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsDetailedEnoughQuestion({
    datasetReviewId,
    form: new IsDetailedEnoughForm.CompletedForm({
      isDetailedEnough: 'yes',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.IsDetailedEnoughQuestion({
    datasetReviewId,
    form: new IsDetailedEnoughForm.InvalidForm({
      isDetailedEnough: Either.left(new IsDetailedEnoughForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
