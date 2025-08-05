import { Data, Either, Function, type Option } from 'effect'
import type { Doi, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewHasNotBeenPublished
  | Errors.DatasetReviewHasNotBeenAssignedADoi

export type State = NotStarted | NotPublished | HasNotBeenAssignedADoi | HasAnInactiveDoi | HasAnActiveDoi

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotPublished extends Data.TaggedClass('NotPublished') {}

export class HasNotBeenAssignedADoi extends Data.TaggedClass('HasNotBeenAssignedADoi') {}

export class HasAnInactiveDoi extends Data.TaggedClass('HasAnInactiveDoi')<{ doi: Doi.Doi }> {}

export class HasAnActiveDoi extends Data.TaggedClass('HasAnActiveDoi')<{ doi: Doi.Doi }> {}

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
