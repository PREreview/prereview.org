import type { Option } from 'effect'
import type * as Events from '../Events.js'

export declare const GetNextExpectedCommandForAUserOnADatasetReview: (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
) => Option.Option<
  'AnswerIfTheDatasetFollowsFairAndCarePrinciples' | 'AnswerIfTheDatasetHasEnoughMetadata' | 'PublishDatasetReview'
>
