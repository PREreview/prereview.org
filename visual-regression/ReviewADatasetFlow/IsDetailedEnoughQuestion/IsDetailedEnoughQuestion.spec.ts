import { Either } from 'effect'
import * as IsDetailedEnoughForm from '../../../src/ReviewADatasetFlow/IsDetailedEnoughQuestion/IsDetailedEnoughForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/IsDetailedEnoughQuestion/IsDetailedEnoughQuestion.ts'
import { Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

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
