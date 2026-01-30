import type { Temporal } from '@js-temporal/polyfill'
import { Array, Data, Either, Function, Match, Option, type Types } from 'effect'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
  readonly publicationDate: Temporal.PlainDate
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.PublicationOfDatasetReviewWasNotRequested
  | Errors.DatasetReviewNotReadyToBeMarkedAsPublished

export type State = NotStarted | NotRequested | NotReady | IsReady | AlreadyMarkedAsPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotRequested extends Data.TaggedClass('NotRequested') {}

export class NotReady extends Data.TaggedClass('NotReady')<{
  missing: Array.NonEmptyReadonlyArray<'DatasetReviewWasAssignedADoi'>
}> {}

export class IsReady extends Data.TaggedClass('IsReady') {}

export class AlreadyMarkedAsPublished extends Data.TaggedClass('AlreadyMarkedAsPublished') {}

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return new NotStarted()
  }

  if (Array.some(events, hasTag('DatasetReviewWasPublished'))) {
    return new AlreadyMarkedAsPublished()
  }

  if (!Array.some(events, hasTag('PublicationOfDatasetReviewWasRequested'))) {
    return new NotRequested()
  }

  if (!Array.some(events, hasTag('DatasetReviewWasAssignedADoi'))) {
    return new NotReady({ missing: ['DatasetReviewWasAssignedADoi'] })
  }

  return new IsReady()
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Match.valueTags(state, {
      NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
      NotRequested: () => Either.left(new Errors.PublicationOfDatasetReviewWasNotRequested()),
      NotReady: ({ missing }) => Either.left(new Errors.DatasetReviewNotReadyToBeMarkedAsPublished({ missing })),
      IsReady: () =>
        Either.right(
          Option.some(
            new Events.DatasetReviewWasPublished({
              datasetReviewId: command.datasetReviewId,
              publicationDate: command.publicationDate,
            }),
          ),
        ),
      AlreadyMarkedAsPublished: () => Either.right(Option.none()),
    }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
