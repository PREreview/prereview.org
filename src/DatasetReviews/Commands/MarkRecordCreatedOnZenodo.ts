import { Array, Data, Either, Function, Match, Option, type Types } from 'effect'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

export interface Command {
  readonly recordId: number
  readonly datasetReviewId: Uuid.Uuid
}

export type Error = Errors.DatasetReviewHasNotBeenStarted | Errors.DatasetReviewAlreadyHasAZenodoRecord

export type State = NotStarted | AlreadyHasARecord | DoesNotHaveARecord

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class AlreadyHasARecord extends Data.TaggedClass('AlreadyHasARecord') {}

export class DoesNotHaveARecord extends Data.TaggedClass('DoesNotHaveARecord') {}

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return new NotStarted()
  }

  if (Array.some(events, hasTag('ZenodoRecordForDatasetReviewWasCreated'))) {
    return new AlreadyHasARecord()
  }

  return new DoesNotHaveARecord()
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Match.valueTags(state, {
      NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
      AlreadyHasARecord: () => Either.left(new Errors.DatasetReviewAlreadyHasAZenodoRecord({})),
      DoesNotHaveARecord: () =>
        Either.right(
          Option.some(
            new Events.ZenodoRecordForDatasetReviewWasCreated({
              recordId: command.recordId,
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
    }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
