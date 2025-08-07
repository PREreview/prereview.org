import { Array, Effect } from 'effect'
import { createDatasetReviewsPage } from './DatasetReviewsPage.js'

export const DatasetReviewsPage = Effect.sync(() => createDatasetReviewsPage({ datasetReviews: Array.empty() }))
