import { Array, Either, Option, Struct } from 'effect'
import type { Orcid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface DataForZenodoRecord {
  readonly author: { orcidId: Orcid.Orcid; persona: Events.PersonaForDatasetReviewWasChosen['persona'] }
  readonly qualityRating: Option.Option<Events.RatedTheQualityOfTheDataset['rating']>
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
  readonly answerToIfTheDatasetHasEnoughMetadata: Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']>
  readonly answerToIfTheDatasetHasTrackedChanges: Option.Option<Events.AnsweredIfTheDatasetHasTrackedChanges['answer']>
  readonly answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<
    Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted['answer']
  >
  readonly answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch['answer']
  >
  readonly answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<
    Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch['answer']
  >
  readonly answerToIfTheDatasetIsDetailedEnough: Option.Option<Events.AnsweredIfTheDatasetIsDetailedEnough['answer']>
  readonly answerToIfTheDatasetIsErrorFree: Option.Option<Events.AnsweredIfTheDatasetIsErrorFree['answer']>
  readonly answerToIfTheDatasetMattersToItsAudience: Option.Option<
    Events.AnsweredIfTheDatasetMattersToItsAudience['answer']
  >
  readonly answerToIfTheDatasetIsReadyToBeShared: Option.Option<Events.AnsweredIfTheDatasetIsReadyToBeShared['answer']>
  readonly answerToIfTheDatasetIsMissingAnything: Events.AnsweredIfTheDatasetIsMissingAnything['answer']
}

export const GetDataForZenodoRecord = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  DataForZenodoRecord,
  Errors.DatasetReviewIsInProgress | Errors.DatasetReviewHasBeenPublished | Errors.UnexpectedSequenceOfEvents
> => {
  const started = Option.getOrUndefined(Array.findLast(events, hasTag('DatasetReviewWasStarted')))

  if (!started) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    return Either.left(new Errors.DatasetReviewHasBeenPublished())
  }

  if (!hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsInProgress())
  }

  const chosenPersona = Array.findLast(events, hasTag('PersonaForDatasetReviewWasChosen'))

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

  const answerToIfTheDatasetMattersToItsAudience = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetMattersToItsAudience'),
  )

  const answerToIfTheDatasetIsReadyToBeShared = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsReadyToBeShared'))

  const answerToIfTheDatasetIsMissingAnything = Array.findLast(events, hasTag('AnsweredIfTheDatasetIsMissingAnything'))

  return Option.match(answerToIfTheDatasetFollowsFairAndCarePrinciples, {
    onNone: () => Either.left(new Errors.UnexpectedSequenceOfEvents({})),
    onSome: answerToIfTheDatasetFollowsFairAndCarePrinciples =>
      Either.right({
        author: {
          orcidId: started.authorId,
          persona: Option.match(chosenPersona, { onSome: Struct.get('persona'), onNone: () => 'public' }),
        },
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
        answerToIfTheDatasetMattersToItsAudience: Option.map(
          answerToIfTheDatasetMattersToItsAudience,
          Struct.get('answer'),
        ),
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
