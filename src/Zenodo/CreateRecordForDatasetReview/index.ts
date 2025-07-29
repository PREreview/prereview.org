import { Data, type Effect } from 'effect'
import type * as Events from '../../Events.js'

export interface DatasetReview {
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
}

export class FailedToCreateRecordForDatasetReview extends Data.TaggedError('FailedToCreateRecordForDatasetReview')<{
  cause?: unknown
}> {}

export const CreateRecordForDatasetReview: (
  datasetReview: DatasetReview,
) => Effect.Effect<number, FailedToCreateRecordForDatasetReview> = () =>
  new FailedToCreateRecordForDatasetReview({ cause: 'not implemented' })
