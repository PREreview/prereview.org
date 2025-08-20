import type { Temporal } from '@js-temporal/polyfill'
import { Array, Either, Option, Struct } from 'effect'
import type { Doi, Orcid, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface PublishedReview {
  author: {
    name: string
    orcid?: Orcid.Orcid
  }
  doi: Doi.Doi
  id: Uuid.Uuid
  questions: {
    answerToIfTheDatasetFollowsFairAndCarePrinciples: 'yes' | 'partly' | 'no' | 'unsure'
    answerToIfTheDatasetHasEnoughMetadata: Option.Option<'yes' | 'partly' | 'no' | 'unsure'>
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

  const answerToIfTheDatasetHasEnoughMetadata = Option.map(
    Array.findLast(events, hasTag('AnsweredIfTheDatasetHasEnoughMetadata')),
    Struct.get('answer'),
  )

  return Option.match(data, {
    onNone: () => Either.left(new Errors.UnexpectedSequenceOfEvents({})),
    onSome: data =>
      Either.right({
        author: {
          name: 'A PREreviewer',
          orcid: data.datasetReviewWasStarted.authorId,
        },
        doi: data.datasetReviewWasAssignedADoi.doi,
        id: data.datasetReviewWasStarted.datasetReviewId,
        questions: {
          answerToIfTheDatasetFollowsFairAndCarePrinciples:
            data.answerToIfTheDatasetFollowsFairAndCarePrinciples.answer,
          answerToIfTheDatasetHasEnoughMetadata,
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
