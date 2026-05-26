import { Array, Option, type Types } from 'effect'
import type * as Events from '../Events.ts'

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
  | 'AnswerIfOthersNeedToBeListedOnTheReview'
  | 'AddInvitationToAppearOnADatasetReviewToTheList'
  | 'DeclareCompetingInterests'
  | 'DeclareFollowingCodeOfConduct'
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

  const others = Array.findLast(events, hasTag('AnsweredIfOthersNeedToBeListedOnTheReview'))

  if (Option.isNone(others)) {
    return Option.some('AnswerIfOthersNeedToBeListedOnTheReview')
  }

  if (others.value.answer === 'yes') {
    const added = Array.filterMap(events, event =>
      event._tag === 'InvitationToAppearOnADatasetReviewAddedToTheList'
        ? Option.some(event.invitationId)
        : Option.none(),
    )

    const removed = Array.filterMap(events, event =>
      event._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList'
        ? Option.some(event.invitationId)
        : Option.none(),
    )

    if (added.length === removed.length) {
      return Option.some('AddInvitationToAppearOnADatasetReviewToTheList')
    }
  }

  if (!hasEvent(events, 'CompetingInterestsForADatasetReviewWereDeclared')) {
    return Option.some('DeclareCompetingInterests')
  }

  if (!hasEvent(events, 'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview')) {
    return Option.some('DeclareFollowingCodeOfConduct')
  }

  return Option.some('PublishDatasetReview')
}

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  ...tags: ReadonlyArray<Types.Tags<Events.DatasetReviewEvent>>
): boolean {
  return Array.some(events, hasTag(...tags))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
