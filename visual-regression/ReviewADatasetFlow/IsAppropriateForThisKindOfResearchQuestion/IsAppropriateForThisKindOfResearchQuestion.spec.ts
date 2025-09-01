import { Either } from 'effect'
import * as IsAppropriateForThisKindOfResearchForm from '../../../src/ReviewADatasetFlow/IsAppropriateForThisKindOfResearchQuestion/IsAppropriateForThisKindOfResearchForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/IsAppropriateForThisKindOfResearchQuestion/IsAppropriateForThisKindOfResearchQuestion.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.CompletedForm({
      isAppropriateForThisKindOfResearch: 'yes',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.IsAppropriateForThisKindOfResearchQuestion({
    datasetReviewId,
    form: new IsAppropriateForThisKindOfResearchForm.InvalidForm({
      isAppropriateForThisKindOfResearch: Either.left(new IsAppropriateForThisKindOfResearchForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
