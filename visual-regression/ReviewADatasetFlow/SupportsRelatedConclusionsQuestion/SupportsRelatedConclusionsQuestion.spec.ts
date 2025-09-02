import { Either } from 'effect'
import * as SupportsRelatedConclusionsForm from '../../../src/ReviewADatasetFlow/SupportsRelatedConclusionsQuestion/SupportsRelatedConclusionsForm.js'
import * as _ from '../../../src/ReviewADatasetFlow/SupportsRelatedConclusionsQuestion/SupportsRelatedConclusionsQuestion.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.CompletedForm({
      supportsRelatedConclusions: 'yes',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.SupportsRelatedConclusionsQuestion({
    datasetReviewId,
    form: new SupportsRelatedConclusionsForm.InvalidForm({
      supportsRelatedConclusions: Either.left(new SupportsRelatedConclusionsForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
