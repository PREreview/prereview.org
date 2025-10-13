import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Struct } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import type { Doi, NonEmptyString, OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export interface PublishedReview {
  author: { orcidId: OrcidId.OrcidId; persona: 'public' | 'pseudonym' }
  dataset: Datasets.DatasetId
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    qualityRating: Option.Option<{
      rating: 'excellent' | 'fair' | 'poor' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetFollowsFairAndCarePrinciples: {
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }
    answerToIfTheDatasetHasEnoughMetadata: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetHasTrackedChanges: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsDetailedEnough: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsErrorFree: Option.Option<{
      answer: 'yes' | 'partly' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetMattersToItsAudience: Option.Option<{
      answer: 'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsReadyToBeShared: Option.Option<{
      answer: 'yes' | 'no' | 'unsure'
      detail: Option.Option<NonEmptyString.NonEmptyString>
    }>
    answerToIfTheDatasetIsMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
  }
  competingInterests: Option.Option<NonEmptyString.NonEmptyString>
  published: Temporal.PlainDate
}

export const GetPublishedReview = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<PublishedReview, Errors.DatasetReviewHasNotBeenPublished | Errors.UnexpectedSequenceOfEvents> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (!hasEvent(events, 'DatasetReviewWasPublished')) {
    return Either.left(
      new Errors.DatasetReviewHasNotBeenPublished({ cause: 'No DatasetReviewWasPublished event found' }),
    )
  }

  const data = Option.all({
    answerToIfTheDatasetFollowsFairAndCarePrinciples: Array.findLast(
      events,
      hasTag('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'),
    ),
    datasetReviewWasAssignedADoi: Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi')),
    datasetReviewWasPublished: Array.findLast(events, hasTag('DatasetReviewWasPublished')),
    datasetReviewWasStarted: Array.findLast(events, hasTag('DatasetReviewWasStarted')),
  })

  const author = Array.findLast(events, hasTag('PersonaForDatasetReviewWasChosen'))

  const ratedTheQualityOfTheDataset = Array.findLast(events, hasTag('RatedTheQualityOfTheDataset'))

  const answerToIfTheDatasetHasEnoughMetadata = Array.findLast(events, hasTag('AnsweredIfTheDatasetHasEnoughMetadata'))

  const answerToIfTheDatasetHasTrackedChanges = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasTrackedChanges')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetHasDataCensoredOrDeleted = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasDataCensoredOrDeleted')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsAppropriateForThisKindOfResearch = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetSupportsRelatedConclusions = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetSupportsRelatedConclusions')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsDetailedEnough = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsDetailedEnough')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsErrorFree = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsErrorFree')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetMattersToItsAudience = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetMattersToItsAudience')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsReadyToBeShared = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsReadyToBeShared')),
    Struct.pick('answer', 'detail'),
  )

  const answerToIfTheDatasetIsMissingAnything = Option.andThen(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsMissingAnything')),
    Struct.get('answer'),
  )

  const competingInterests = Option.andThen(
    Array.findLast(events, hasTag('CompetingInterestsForADatasetReviewWereDeclared')),
    Struct.get('competingInterests'),
  )

  return Option.match(data, {
    onNone: () => Either.left(new Errors.UnexpectedSequenceOfEvents({})),
    onSome: data =>
      Either.right({
        author: {
          orcidId: data.datasetReviewWasStarted.authorId,
          persona: Option.match(author, { onSome: Struct.get('persona'), onNone: () => 'public' }),
        },
        dataset: data.datasetReviewWasStarted.datasetId,
        doi: data.datasetReviewWasAssignedADoi.doi,
        id: data.datasetReviewWasStarted.datasetReviewId,
        questions: {
          qualityRating: Option.andThen(ratedTheQualityOfTheDataset, Struct.pick('rating', 'detail')),
          answerToIfTheDatasetFollowsFairAndCarePrinciples: Struct.pick(
            data.answerToIfTheDatasetFollowsFairAndCarePrinciples,
            'answer',
            'detail',
          ),
          answerToIfTheDatasetHasEnoughMetadata: Option.andThen(
            answerToIfTheDatasetHasEnoughMetadata,
            Struct.pick('answer', 'detail'),
          ),
          answerToIfTheDatasetHasTrackedChanges,
          answerToIfTheDatasetHasDataCensoredOrDeleted,
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch,
          answerToIfTheDatasetSupportsRelatedConclusions,
          answerToIfTheDatasetIsDetailedEnough,
          answerToIfTheDatasetIsErrorFree,
          answerToIfTheDatasetMattersToItsAudience,
          answerToIfTheDatasetIsReadyToBeShared,
          answerToIfTheDatasetIsMissingAnything,
        },
        competingInterests,
        published: data.datasetReviewWasPublished.publicationDate,
      }),
  })
}

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
