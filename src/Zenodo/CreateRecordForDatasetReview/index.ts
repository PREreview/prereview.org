import { Data, Effect } from 'effect'
import { DatasetReviewToDepositMetadata, type DatasetReview } from './DatasetReviewToDepositMetadata.js'

export type { DatasetReview } from './DatasetReviewToDepositMetadata.js'

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview = Effect.fn(function* (datasetReview: DatasetReview) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const depositMetadata = DatasetReviewToDepositMetadata(datasetReview)

  return yield* new FailedToCreateRecordForDatasetReview({ cause: 'not implemented' })

  return 1
})
