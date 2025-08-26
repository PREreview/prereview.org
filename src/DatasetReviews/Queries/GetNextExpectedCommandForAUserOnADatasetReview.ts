import { Array, Option } from 'effect'
import type * as Events from '../Events.js'

export type NextExpectedCommand =
  | 'AnswerIfTheDatasetFollowsFairAndCarePrinciples'
  | 'AnswerIfTheDatasetHasEnoughMetadata'
  | 'AnswerIfTheDatasetHasTrackedChanges'
  | 'PublishDatasetReview'

export const GetNextExpectedCommandForAUserOnADatasetReview = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Option.Option<NextExpectedCommand> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Option.none()
  }

  if (hasEvent(events, 'DatasetReviewWasPublished', 'PublicationOfDatasetReviewWasRequested')) {
    return Option.none()
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetFollowsFairAndCarePrinciples')) {
    return Option.some('AnswerIfTheDatasetFollowsFairAndCarePrinciples')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetHasEnoughMetadata')) {
    return Option.some('AnswerIfTheDatasetHasEnoughMetadata')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetHasTrackedChanges')) {
    return Option.some('AnswerIfTheDatasetHasTrackedChanges')
  }

  return Option.some('PublishDatasetReview')
}

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  ...tags: ReadonlyArray<Events.DatasetReviewEvent['_tag']>
): boolean {
  return Array.some(events, hasTag(...tags))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
