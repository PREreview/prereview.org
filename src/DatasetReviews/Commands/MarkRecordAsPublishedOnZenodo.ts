import { Array, Data, Either, Function, Match, Option, type Types } from 'effect'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewHasNotBeenPublished
  | Errors.DatasetReviewDoesNotHaveAZenodoRecord

export type State = NotStarted | NotPublished | DoesNotHaveARecord | HasAnUnpublishedRecord | HasAPublishedRecord

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotPublished extends Data.TaggedClass('NotPublished') {}

export class DoesNotHaveARecord extends Data.TaggedClass('DoesNotHaveARecord') {}

export class HasAnUnpublishedRecord extends Data.TaggedClass('HasAnUnpublishedRecord')<{ recordId: number }> {}

export class HasAPublishedRecord extends Data.TaggedClass('HasAPublishedRecord')<{ recordId: number }> {}

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!hasEvent(events, 'DatasetReviewWasStarted')) {
    return new NotStarted()
  }

  if (!hasEvent(events, 'DatasetReviewWasPublished')) {
    return new NotPublished()
  }

  const recordCreated = Array.findLast(events, hasTag('ZenodoRecordForDatasetReviewWasCreated'))

  if (Option.isNone(recordCreated)) {
    return new DoesNotHaveARecord()
  }

  const recordId = recordCreated.value.recordId

  return Option.match(Array.findLast(events, hasTag('ZenodoRecordForDatasetReviewWasPublished')), {
    onNone: () => new HasAnUnpublishedRecord({ recordId }),
    onSome: () => new HasAPublishedRecord({ recordId }),
  })
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Match.valueTags(state, {
      NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
      NotPublished: () => Either.left(new Errors.DatasetReviewHasNotBeenPublished({})),
      DoesNotHaveARecord: () => Either.left(new Errors.DatasetReviewDoesNotHaveAZenodoRecord({})),
      HasAnUnpublishedRecord: () =>
        Either.right(
          Option.some(
            new Events.ZenodoRecordForDatasetReviewWasPublished({ datasetReviewId: command.datasetReviewId }),
          ),
        ),
      HasAPublishedRecord: () => Either.right(Option.none()),
    }),
)

function hasEvent(
  events: ReadonlyArray<Events.DatasetReviewEvent>,
  tag: Types.Tags<Events.DatasetReviewEvent>,
): boolean {
  return Array.some(events, hasTag(tag))
}

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
