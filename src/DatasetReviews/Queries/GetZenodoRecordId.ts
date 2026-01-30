import { Array, Either, Option, type Types } from 'effect'
import * as Errors from '../Errors.ts'
import type * as Events from '../Events.ts'

export const GetZenodoRecordId = (
  events: ReadonlyArray<Events.DatasetReviewEvent>,
): Either.Either<number, Errors.DatasetReviewDoesNotHaveAZenodoRecord | Errors.UnexpectedSequenceOfEvents> => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return Either.left(new Errors.UnexpectedSequenceOfEvents({ cause: 'No DatasetReviewWasStarted event found' }))
  }

  return Option.match(Array.findLast(events, hasTag('ZenodoRecordForDatasetReviewWasCreated')), {
    onNone: () =>
      Either.left(
        new Errors.DatasetReviewDoesNotHaveAZenodoRecord({
          cause: 'No ZenodoRecordForDatasetReviewWasCreated event found',
        }),
      ),
    onSome: zenodoRecordForDatasetReviewWasCreated => Either.right(zenodoRecordForDatasetReviewWasCreated.recordId),
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
