import { Data, Either, Function, Match, Option, type Array } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import * as Events from '../Events.js'

export interface Command {
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewNotReadyToBePublished
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

export type State = NotStarted | NotReady | IsReady | IsBeingPublished | HasBeenPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotReady extends Data.TaggedClass('NotReady')<{
  missing: Array.NonEmptyReadonlyArray<'AnsweredIfTheDatasetFollowsFairAndCarePrinciples'>
}> {}

export class IsReady extends Data.TaggedClass('IsReady') {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  throw new Error('Not implemented')
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> =>
    Match.valueTags(state, {
      NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
      NotReady: ({ missing }) => Either.left(new Errors.DatasetReviewNotReadyToBePublished({ missing })),
      IsBeingPublished: () => Either.left(new Errors.DatasetReviewIsBeingPublished()),
      HasBeenPublished: () => Either.left(new Errors.DatasetReviewHasBeenPublished()),
      IsReady: () =>
        Either.right(
          Option.some(new Events.PublicationOfDatasetReviewWasRequested({ datasetReviewId: command.datasetReviewId })),
        ),
    }),
)
