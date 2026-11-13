import { Array, Result, type Types } from 'effect'
import * as Queries from '../../../Queries.ts'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export const CheckIfReviewIsBeingPublished = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Result.Result<
  void,
  | Errors.UnknownDatasetReview
  | Errors.DatasetReviewHasBeenPublished
  | Errors.DatasetReviewIsInProgress
  | Queries.UnexpectedSequenceOfEvents
> => {
  if (Array.isReadonlyArrayEmpty(events)) {
    return Result.fail(new Errors.UnknownDatasetReview({}))
  }

  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return Result.fail(new Queries.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  if (Array.some(events, hasTag('DatasetReviewWasPublished'))) {
    return Result.fail(new Errors.DatasetReviewHasBeenPublished())
  }

  if (!Array.some(events, hasTag('PublicationOfDatasetReviewWasRequested'))) {
    return Result.fail(new Errors.DatasetReviewIsInProgress())
  }

  return Result.void
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
