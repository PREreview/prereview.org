import { Data, Effect } from 'effect'
import { Zenodo } from '../../ExternalApis/index.ts'
import { DatasetReviewToDepositMetadata, type DatasetReview } from './DatasetReviewToDepositMetadata.ts'

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview = Effect.fn(
  function* (datasetReview: DatasetReview) {
    const depositMetadata = DatasetReviewToDepositMetadata(datasetReview)

    const deposition = yield* Zenodo.createDeposition(depositMetadata)

    yield* Zenodo.uploadFile(deposition, { content: depositMetadata.description.toString(), name: 'review.html' })

    return deposition.id
  },
  Effect.catchAll(error => new FailedToCreateRecordForDatasetReview({ cause: error })),
)
