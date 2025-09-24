import { Array, Boolean, Data, Either, flow, Function, Match, Option, Predicate } from 'effect'
import type * as Datasets from '../../Datasets/index.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

export interface StartDatasetReview {
  readonly authorId: OrcidId.OrcidId
  readonly datasetId: Datasets.DatasetId
  readonly datasetReviewId: Uuid.Uuid
}

export type StartDatasetReviewState = NotStarted | HasBeenStarted

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class HasBeenStarted extends Data.TaggedClass('HasBeenStarted') {}

export const foldState: (events: ReadonlyArray<Events.DatasetReviewEvent>) => StartDatasetReviewState = flow(
  Array.some(Predicate.isTagged('DatasetReviewWasStarted')),
  Boolean.match({ onFalse: () => new NotStarted(), onTrue: () => new HasBeenStarted() }),
)

export const decide: {
  (
    state: StartDatasetReviewState,
    command: StartDatasetReview,
  ): Either.Either<Option.Option<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted>
  (
    command: StartDatasetReview,
  ): (
    state: StartDatasetReviewState,
  ) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted>
} = Function.dual(
  2,
  (
    state: StartDatasetReviewState,
    command: StartDatasetReview,
  ): Either.Either<Option.Option<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted> =>
    Match.valueTags(state, {
      NotStarted: () =>
        Either.right(
          Option.some(
            new Events.DatasetReviewWasStarted({
              authorId: command.authorId,
              datasetId: command.datasetId,
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      HasBeenStarted: () => Either.left(new Errors.DatasetReviewWasAlreadyStarted()),
    }),
)
