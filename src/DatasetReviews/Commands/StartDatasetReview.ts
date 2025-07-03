import { Array, Boolean, Data, Either, flow, Function, Match, Predicate } from 'effect'
import type * as Datasets from '../../Datasets/index.js'
import type { Orcid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import * as Events from '../Events.js'

export interface StartDatasetReview {
  readonly authorId: Orcid.Orcid
  readonly datasetId: Datasets.DatasetId
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
  ): Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted>
  (
    command: StartDatasetReview,
  ): (
    state: StartDatasetReviewState,
  ) => Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted>
} = Function.dual(
  2,
  (
    state: StartDatasetReviewState,
    command: StartDatasetReview,
  ): Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Errors.DatasetReviewWasAlreadyStarted> =>
    Match.valueTags(state, {
      NotStarted: () =>
        Either.right(
          Array.of(new Events.DatasetReviewWasStarted({ authorId: command.authorId, datasetId: command.datasetId })),
        ),
      HasBeenStarted: () => Either.left(new Errors.DatasetReviewWasAlreadyStarted()),
    }),
)
