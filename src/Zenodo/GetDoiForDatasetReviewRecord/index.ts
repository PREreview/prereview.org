import { Data, type Effect } from 'effect'
import type { Doi } from '../../types/index.js'

export class FailedToGetRecordForDatasetReview extends Data.TaggedError('FailedToGetRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const GetDoiForDatasetReviewRecord: (
  recordId: number,
) => Effect.Effect<Doi.Doi, FailedToGetRecordForDatasetReview> = () =>
  new FailedToGetRecordForDatasetReview({ cause: 'not implemented' })
