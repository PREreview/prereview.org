import { Data, Effect } from 'effect'
import { GetDeposition } from '../GetDeposition/index.js'

export class FailedToGetRecordForDatasetReview extends Data.TaggedError('FailedToGetRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const GetDoiForDatasetReviewRecord = Effect.fn(
  function* (recordId: number) {
    const deposition = yield* GetDeposition(recordId)

    return deposition.metadata.prereserveDoi.doi
  },
  Effect.catchAll(error => new FailedToGetRecordForDatasetReview({ cause: error })),
)
