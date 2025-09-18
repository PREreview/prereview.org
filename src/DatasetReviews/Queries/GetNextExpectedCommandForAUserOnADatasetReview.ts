import { Array, Option } from 'effect'
import type * as Events from '../Events.js'

export type NextExpectedCommand =
  | 'RateTheQuality'
  | 'AnswerIfTheDatasetFollowsFairAndCarePrinciples'
  | 'AnswerIfTheDatasetHasEnoughMetadata'
  | 'AnswerIfTheDatasetHasTrackedChanges'
  | 'AnswerIfTheDatasetHasDataCensoredOrDeleted'
  | 'AnswerIfTheDatasetIsAppropriateForThisKindOfResearch'
  | 'AnswerIfTheDatasetSupportsRelatedConclusions'
  | 'AnswerIfTheDatasetIsDetailedEnough'
  | 'AnswerIfTheDatasetIsErrorFree'
  | 'AnswerIfTheDatasetMattersToItsAudience'
  | 'AnswerIfTheDatasetIsReadyToBeShared'
  | 'AnswerIfTheDatasetIsMissingAnything'
  | 'ChoosePersona'
  | 'DeclareCompetingInterests'
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

  if (!hasEvent(events, 'RatedTheQualityOfTheDataset')) {
    return Option.some('RateTheQuality')
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

  if (!hasEvent(events, 'AnsweredIfTheDatasetHasDataCensoredOrDeleted')) {
    return Option.some('AnswerIfTheDatasetHasDataCensoredOrDeleted')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch')) {
    return Option.some('AnswerIfTheDatasetIsAppropriateForThisKindOfResearch')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetSupportsRelatedConclusions')) {
    return Option.some('AnswerIfTheDatasetSupportsRelatedConclusions')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetIsDetailedEnough')) {
    return Option.some('AnswerIfTheDatasetIsDetailedEnough')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetIsErrorFree')) {
    return Option.some('AnswerIfTheDatasetIsErrorFree')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetMattersToItsAudience')) {
    return Option.some('AnswerIfTheDatasetMattersToItsAudience')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetIsReadyToBeShared')) {
    return Option.some('AnswerIfTheDatasetIsReadyToBeShared')
  }

  if (!hasEvent(events, 'AnsweredIfTheDatasetIsMissingAnything')) {
    return Option.some('AnswerIfTheDatasetIsMissingAnything')
  }

  if (!hasEvent(events, 'PersonaForDatasetReviewWasChosen')) {
    return Option.some('ChoosePersona')
  }

  if (!hasEvent(events, 'CompetingInterestsForADatasetReviewWereDeclared')) {
    return Option.some('DeclareCompetingInterests')
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
