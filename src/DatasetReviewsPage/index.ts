import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import * as Datasets from '../Datasets/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { Doi } from '../types/index.js'
import { createDatasetReviewsPage } from './DatasetReviewsPage.js'

export const DatasetReviewsPage = Effect.fn(
  function* () {
    const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })

    const datasetReviewIds = yield* DatasetReviews.findPublishedReviewsForADataset(datasetId)

    const datasetReviews = yield* Effect.forEach(datasetReviewIds, DatasetReviews.getPublishedReview)

    return createDatasetReviewsPage({ datasetReviews })
  },
  Effect.catchTags({
    DatasetReviewHasNotBeenPublished: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => HavingProblemsPage,
  }),
)
