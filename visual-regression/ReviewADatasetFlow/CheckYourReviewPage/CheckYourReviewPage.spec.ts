import { Option } from 'effect'
import type * as DatasetReviews from '../../../src/DatasetReviews/index.js'
import * as _ from '../../../src/ReviewADatasetFlow/CheckYourReviewPage/CheckYourReviewPage.js'
import { Uuid } from '../../../src/types/index.js'

import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = _.CheckYourReviewPage({
    datasetReviewId,
    review,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReviewId = Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f')

const review = {
  qualityRating: Option.some('excellent'),
  answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
  answerToIfTheDatasetHasEnoughMetadata: Option.some('yes'),
  answerToIfTheDatasetHasTrackedChanges: Option.some('yes'),
  answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('yes'),
  answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.some('yes'),
} satisfies DatasetReviews.DatasetReviewPreview
