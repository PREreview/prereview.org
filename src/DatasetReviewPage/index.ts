import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { PageNotFound } from '../PageNotFound/index.js'
import type { Uuid } from '../types/index.js'
import { createDatasetReviewPage } from './DatasetReviewPage.js'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)

    return createDatasetReviewPage({ datasetReview })
  },
  Effect.catchTags({
    DatasetReviewHasNotBeenPublished: () => PageNotFound,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
