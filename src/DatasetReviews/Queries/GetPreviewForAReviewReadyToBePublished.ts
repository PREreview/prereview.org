import { Array, Either, Option, Struct, type Types } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import type { OrcidId } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export interface DatasetReviewPreview {
  readonly author: {
    readonly orcidId: OrcidId.OrcidId
    readonly persona: Option.Option<Events.PersonaForDatasetReviewWasChosen['persona']>
  }
  readonly dataset: Datasets.DatasetId
  readonly competingInterests: Events.CompetingInterestsForADatasetReviewWereDeclared['competingInterests']
  readonly qualityRating: Option.Option<Pick<Events.RatedTheQualityOfTheDataset, 'rating' | 'detail'>>
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Pick<
    Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples,
    'answer' | 'detail'
  >
  readonly answerToIfTheDatasetHasEnoughMetadata: Option.Option<
    Pick<Events.AnsweredIfTheDatasetHasEnoughMetadata, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetHasTrackedChanges: Option.Option<
    Pick<Events.AnsweredIfTheDatasetHasTrackedChanges, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<
    Pick<Events.AnsweredIfTheDatasetHasDataCensoredOrDeleted, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<
    Pick<Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<
    Pick<Events.AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetIsDetailedEnough: Option.Option<
    Pick<Events.AnsweredIfTheDatasetIsDetailedEnough, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetIsErrorFree: Option.Option<
    Pick<Events.AnsweredIfTheDatasetIsErrorFree, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetMattersToItsAudience: Option.Option<
    Pick<Events.AnsweredIfTheDatasetMattersToItsAudience, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetIsReadyToBeShared: Option.Option<
    Pick<Events.AnsweredIfTheDatasetIsReadyToBeShared, 'answer' | 'detail'>
  >
  readonly answerToIfTheDatasetIsMissingAnything: Option.Option<Events.AnsweredIfTheDatasetIsMissingAnything['answer']>
}

export const GetPreviewForAReviewReadyToBePublished = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  DatasetReviewPreview,
  | Errors.DatasetReviewNotReadyToBePublished
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished
  | Errors.UnexpectedSequenceOfEvents
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

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsBeingPublished())
  }

  const author = Array.findLast(events, hasTag('PersonaForDatasetReviewWasChosen'))

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

  const competingInterests = Array.findLast(events, hasTag('CompetingInterestsForADatasetReviewWereDeclared'))

  return Option.match(answerToIfTheDatasetFollowsFairAndCarePrinciples, {
    onNone: () =>
      Either.left(
        new Errors.DatasetReviewNotReadyToBePublished({
          missing: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
        }),
      ),
    onSome: answerToIfTheDatasetFollowsFairAndCarePrinciples =>
      Either.right({
        author: { orcidId: started.authorId, persona: Option.map(author, Struct.get('persona')) },
        dataset: started.datasetId,
        competingInterests: Option.andThen(competingInterests, Struct.get('competingInterests')),
        qualityRating: Option.map(qualityRating, Struct.pick('rating', 'detail')),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: Struct.pick(
          answerToIfTheDatasetFollowsFairAndCarePrinciples,
          'answer',
          'detail',
        ),
        answerToIfTheDatasetHasEnoughMetadata: Option.map(
          answerToIfTheDatasetHasEnoughMetadata,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetHasTrackedChanges: Option.map(
          answerToIfTheDatasetHasTrackedChanges,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetHasDataCensoredOrDeleted: Option.map(
          answerToIfTheDatasetHasDataCensoredOrDeleted,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.map(
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: Option.map(
          answerToIfTheDatasetSupportsRelatedConclusions,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetIsDetailedEnough: Option.map(
          answerToIfTheDatasetIsDetailedEnough,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetIsErrorFree: Option.map(answerToIfTheDatasetIsErrorFree, Struct.pick('answer', 'detail')),
        answerToIfTheDatasetMattersToItsAudience: Option.map(
          answerToIfTheDatasetMattersToItsAudience,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetIsReadyToBeShared: Option.map(
          answerToIfTheDatasetIsReadyToBeShared,
          Struct.pick('answer', 'detail'),
        ),
        answerToIfTheDatasetIsMissingAnything: Option.map(answerToIfTheDatasetIsMissingAnything, Struct.get('answer')),
      }),
  })
}

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  tag: Types.Tags<Events.DatasetReviewEvent>,
): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
