import { Data, Effect } from 'effect'
import { Zenodo } from '../../../ExternalApis/index.ts'

export class FailedToGetRecordForDatasetReview extends Data.TaggedError('FailedToGetRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const GetDoiForDatasetReviewRecord = Effect.fn(
  function* (recordId: number) {
    const deposition = yield* Zenodo.getDeposition(recordId)

    return deposition.metadata.prereserveDoi.doi
  },
  Effect.catchAll(error => new FailedToGetRecordForDatasetReview({ cause: error })),
)
