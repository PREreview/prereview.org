import type * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewPublishedPage/ReviewPublishedPage.ts'
import { Doi, Uuid } from '../../../src/types/index.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewPublishedPage({ datasetReview })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const datasetReview = {
  doi: Doi.Doi('10.5072/zenodo.1061864'),
  id: Uuid.Uuid('6c7c36e6-e843-4c95-9c56-18279e9ca84f'),
} satisfies DatasetReviews.PublishedReviewDetails
