import { Array, Either } from 'effect'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export const CheckIfReviewIsBeingPublished = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  void,
  Errors.DatasetReviewHasBeenPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
> => {
  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (Array.some(events, hasTag('DatasetReviewWasPublished'))) {
    return Either.left(new Errors.DatasetReviewHasBeenPublished())
  }

  if (!Array.some(events, hasTag('PublicationOfDatasetReviewWasRequested'))) {
    return Either.left(new Errors.DatasetReviewIsInProgress())
  }

  return Either.void
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
