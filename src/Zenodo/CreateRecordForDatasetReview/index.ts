import { Data, Effect } from 'effect'
import { CreateDeposition } from '../CreateDeposition/index.js'
import { UploadFile } from '../UploadFile/index.js'
import { DatasetReviewToDepositMetadata, type DatasetReview } from './DatasetReviewToDepositMetadata.js'

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview = Effect.fn(
  function* (datasetReview: DatasetReview) {
    const depositMetadata = DatasetReviewToDepositMetadata(datasetReview)

    const deposition = yield* CreateDeposition(depositMetadata)

    yield* UploadFile(deposition, { content: depositMetadata.description.toString(), name: 'review.html' })

    return deposition.id
  },
  Effect.catchAll(error => new FailedToCreateRecordForDatasetReview({ cause: error })),
)
