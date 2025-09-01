import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import { createDatasetReviewPage } from '../../src/DatasetReviewPage/DatasetReviewPage.js'
import type * as DatasetReviews from '../../src/DatasetReviews/index.js'
import { Doi, Orcid, Uuid } from '../../src/types/index.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createDatasetReviewPage({
    datasetReview,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReview: DatasetReviews.PublishedReview = {
  author: {
    name: 'Josiah Carberry',
    orcid: Orcid.Orcid('0000-0002-1825-0097'),
  },
  doi: Doi.Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  questions: {
    qualityRating: Option.some('excellent'),
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes',
    answerToIfTheDatasetHasEnoughMetadata: Option.some('yes'),
    answerToIfTheDatasetHasTrackedChanges: Option.some('yes'),
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.some('yes'),
  },
  published: Temporal.PlainDate.from('2025-08-06'),
}
