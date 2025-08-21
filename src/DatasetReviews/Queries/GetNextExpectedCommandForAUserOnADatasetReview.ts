import type { Option } from 'effect'
import type * as Events from '../Events.js'

export type NextExpectedCommand =
  | 'AnswerIfTheDatasetFollowsFairAndCarePrinciples'
  | 'AnswerIfTheDatasetHasEnoughMetadata'
  | 'PublishDatasetReview'

export const GetNextExpectedCommandForAUserOnADatasetReview = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Option.Option<NextExpectedCommand> => {
  throw new Error('not implemented')
}
