import { Either } from 'effect'
import * as HasTrackedChangesForm from '../../../src/ReviewADatasetFlow/HasTrackedChangesQuestion/HasTrackedChangesForm.ts'
import * as _ from '../../../src/ReviewADatasetFlow/HasTrackedChangesQuestion/HasTrackedChangesQuestion.ts'
import { Uuid } from '../../../src/types/index.ts'

import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.EmptyForm(),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an answer', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.CompletedForm({
      hasTrackedChanges: 'yes',
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = _.HasTrackedChangesQuestion({
    datasetReviewId,
    form: new HasTrackedChangesForm.InvalidForm({
      hasTrackedChanges: Either.left(new HasTrackedChangesForm.Missing()),
    }),
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')
