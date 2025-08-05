import { type Array, Data, Either, Function, type Option } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => new NotStarted()

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
)
