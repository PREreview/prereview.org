import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Match, Option, pipe, Struct } from 'effect'
import * as Personas from '../../Personas/index.js'
import { NonEmptyString, type Doi, type Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface PublishedReview {
  author: Personas.Persona
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    qualityRating: Option.Option<'excellent' | 'fair' | 'poor' | 'unsure'>
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
    answerToIfTheDatasetHasEnoughMetadata: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetHasTrackedChanges: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetHasDataCensoredOrDeleted: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetIsAppropriateForThisKindOfResearch: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetSupportsRelatedConclusions: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetIsDetailedEnough: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetIsErrorFree: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
    answerToIfTheDatasetMattersToItsAudience: Option.Option<
      'very-consequential' | 'somewhat-consequential' | 'not-consequential' | 'unsure'
    >
    answerToIfTheDatasetIsReadyToBeShared: Option.Option<'yes' | 'no' | 'unsure'>
    answerToIfTheDatasetIsMissingAnything: Option.Option<NonEmptyString.NonEmptyString>
  }
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

  const qualityRating = Option.map(Array.findLast(events, hasTag('RatedTheQualityOfTheDataset')), Struct.get('rating'))

  const answerToIfTheDatasetHasEnoughMetadata = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasEnoughMetadata')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetHasTrackedChanges = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasTrackedChanges')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetHasDataCensoredOrDeleted = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasDataCensoredOrDeleted')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetIsAppropriateForThisKindOfResearch = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsAppropriateForThisKindOfResearch')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetSupportsRelatedConclusions = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetSupportsRelatedConclusions')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetIsDetailedEnough = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsDetailedEnough')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetIsErrorFree = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsErrorFree')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetMattersToItsAudience = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetMattersToItsAudience')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetIsReadyToBeShared = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsReadyToBeShared')),
    Struct.get('answer'),
  )

  const answerToIfTheDatasetIsMissingAnything = Option.andThen(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetIsMissingAnything')),
    Struct.get('answer'),
  )

  return Option.match(data, {
    onNone: () => Either.left(new Errors.UnexpectedSequenceOfEvents({})),
    onSome: data =>
      Either.right({
        author: Option.match(author, {
          onSome: pipe(
            Match.type<Events.PersonaForDatasetReviewWasChosen>(),
            Match.when(
              { persona: { type: 'public' } },
              author =>
                new Personas.PublicPersona({
                  name: author.persona.name,
                  orcidId: author.persona.orcidId,
                }),
            ),
            Match.when(
              { persona: { type: 'pseudonym' } },
              author => new Personas.PseudonymPersona({ pseudonym: author.persona.pseudonym }),
            ),
            Match.orElseAbsurd,
          ),
          onNone: () =>
            new Personas.PublicPersona({
              name: NonEmptyString.NonEmptyString('A PREreviewer'),
              orcidId: data.datasetReviewWasStarted.authorId,
            }),
        }),
        doi: data.datasetReviewWasAssignedADoi.doi,
        id: data.datasetReviewWasStarted.datasetReviewId,
        questions: {
          qualityRating,
          answerToIfTheDatasetFollowsFairAndCarePrinciples:
            data.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer,
          answerToIfTheDatasetHasEnoughMetadata,
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
