import { Effect } from 'effect'
import { createDatasetReviewsPage } from './DatasetReviewsPage.js'

export const DatasetReviewsPage = Effect.sync(createDatasetReviewsPage)
