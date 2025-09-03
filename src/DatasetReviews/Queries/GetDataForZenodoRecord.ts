import { Array, Either, Option, Struct } from 'effect'
import type * as Zenodo from '../../Zenodo/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export const GetDataForZenodoRecord = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  Zenodo.DatasetReview,
  Errors.DatasetReviewIsInProgress | Errors.DatasetReviewHasBeenPublished | Errors.UnexpectedSequenceOfEvents
> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    return Either.left(new Errors.DatasetReviewHasBeenPublished())
  }

  if (!hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsInProgress())
  }

  const qualityRating = Array.findLast(events, hasTag('RatedTheQualityOfTheDataset'))

  const answerToIfTheDatasetFollowsFairAndCarePrinciples = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'),
  )

  const answerToIfTheDatasetHasEnoughMetadata = Array.findLast(events, hasTag('AnsweredIfTheDatasetHasEnoughMetadata'))

  const answerToIfTheDatasetHasTrackedChanges = Array.findLast(events, hasTag('AnsweredIfTheDatasetHasTrackedChanges'))

  const answerToIfTheDatasetHasDataCensoredOrDeleted = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetHasDataCensoredOrDeleted'),
  )

  const answerToIfTheDatasetIsAppropriateForThisKindOfResearch = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch'),
  )

  const answerToIfTheDatasetSupportsRelatedConclusions = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetSupportsRelatedConclusions'),
  )

  const answerToIfTheDatasetIsDetailedEnough = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsDetailedEnough'))

  const answerToIfTheDatasetIsErrorFree = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsErrorFree'))

  const answerToIfTheDatasetIsReadyToBeShared = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsReadyToBeShared'))

  const answerToIfTheDatasetIsMissingAnything = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsMissingAnything'))

  return Option.match(answerToIfTheDatasetFollowsFairAndCarePrinciples, {
    onNone: () => Either.left(new Errors.UnexpectedSequenceOfEvents({})),
    onSome: answerToIfTheDatasetFollowsFairAndCarePrinciples =>
      Either.right({
        qualityRating: Option.map(qualityRating, Struct.get('rating')),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: answerToIfTheDatasetFollowsFairAndCarePrinciples.answer,
        answerToIfTheDatasetHasEnoughMetadata: Option.map(answerToIfTheDatasetHasEnoughMetadata, Struct.get('answer')),
        answerToIfTheDatasetHasTrackedChanges: Option.map(answerToIfTheDatasetHasTrackedChanges, Struct.get('answer')),
        answerToIfTheDatasetHasDataCensoredOrDeleted: Option.map(
          answerToIfTheDatasetHasDataCensoredOrDeleted,
          Struct.get('answer'),
        ),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.map(
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
          Struct.get('answer'),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: Option.map(
          answerToIfTheDatasetSupportsRelatedConclusions,
          Struct.get('answer'),
        ),
        answerToIfTheDatasetIsDetailedEnough: Option.map(answerToIfTheDatasetIsDetailedEnough, Struct.get('answer')),
        answerToIfTheDatasetIsErrorFree: Option.map(answerToIfTheDatasetIsErrorFree, Struct.get('answer')),
        answerToIfTheDatasetIsReadyToBeShared: Option.map(answerToIfTheDatasetIsReadyToBeShared, Struct.get('answer')),
        answerToIfTheDatasetIsMissingAnything: Option.andThen(
          answerToIfTheDatasetIsMissingAnything,
          Struct.get('answer'),
        ),
      }),
  })
}

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
