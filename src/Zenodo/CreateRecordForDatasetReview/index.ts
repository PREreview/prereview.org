import { Data, type Effect } from 'effect'
import type * as DatasetReviews from '../../DatasetReviews/index.js'

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview: (
  datasetReview: DatasetReviews.DatasetReviewPreview,
) => Effect.Effect<number, FailedToCreateRecordForDatasetReview> = () =>
  new FailedToCreateRecordForDatasetReview({ cause: 'not implemented' })
