import { Array, Either, Option } from 'effect'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface DatasetReviewPreview {
  readonly answerToIfTheDatasetFollowsFairAndCarePrinciples: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
  readonly answerToIfTheDatasetHasEnoughMetadata: Option.Option<Events.AnsweredIfTheDatasetHasEnoughMetadata['answer']>
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
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    return Either.left(new Errors.DatasetReviewHasBeenPublished())
  }

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsBeingPublished())
  }

  const answerToIfTheDatasetFollowsFairAndCarePrinciples = Array.findLast(
    events,
    hasTag('AnsweredIfTheDatasetFollowsFairAndCarePrinciples'),
  )

  return Option.match(answerToIfTheDatasetFollowsFairAndCarePrinciples, {
    onNone: () =>
      Either.left(
        new Errors.DatasetReviewNotReadyToBePublished({
          missing: ['AnsweredIfTheDatasetFollowsFairAndCarePrinciples'],
        }),
      ),
    onSome: answerToIfTheDatasetFollowsFairAndCarePrinciples =>
      Either.right({
        answerToIfTheDatasetFollowsFairAndCarePrinciples: answerToIfTheDatasetFollowsFairAndCarePrinciples.answer,
        answerToIfTheDatasetHasEnoughMetadata: Option.none(),
      }),
  })
}

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
