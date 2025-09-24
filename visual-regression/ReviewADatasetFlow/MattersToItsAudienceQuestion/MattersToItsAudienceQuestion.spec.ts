import { Either } from 'effect'
import * as MattersToItsAudienceForm from '../../../src/ReviewADatasetFlow/MattersToItsAudienceQuestion/MattersToItsAudienceForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/MattersToItsAudienceQuestion/MattersToItsAudienceQuestion.ts'
import { Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.MattersToItsAudienceQuestion({
    datasetReviewId,
    form: new MattersToItsAudienceForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.MattersToItsAudienceQuestion({
    datasetReviewId,
    form: new MattersToItsAudienceForm.CompletedForm({
      mattersToItsAudience: 'very-consequential',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.MattersToItsAudienceQuestion({
    datasetReviewId,
    form: new MattersToItsAudienceForm.InvalidForm({
      mattersToItsAudience: Either.left(new MattersToItsAudienceForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
