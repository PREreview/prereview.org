import { Array, Either, Option } from 'effect'
import type { Doi } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export const GetPublishedDoi = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<
  Doi.Doi,
  Errors.DatasetReviewIsBeingPublished | Errors.DatasetReviewIsInProgress | Errors.UnexpectedSequenceOfEvents
> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (hasEvent(events, 'DatasetReviewWasPublished')) {
    return Option.match(Array.findLast(events, hasTag('DatasetReviewWasAssignedADoi')), {
      onNone: () =>
        Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasAssignedADoi event found' })),
      onSome: datasetReviewWasAssignedADoi => Either.right(datasetReviewWasAssignedADoi.doi),
    })
  }

  if (hasEvent(events, 'PublicationOfDatasetReviewWasRequested')) {
    return Either.left(new Errors.DatasetReviewIsBeingPublished())
  }

  return Either.left(new Errors.DatasetReviewIsInProgress())
}

function hasEvent(events: ReadonlyArray<Events.DatasetReviewEvent>, tag: Events.DatasetReviewEvent['_tag']): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
