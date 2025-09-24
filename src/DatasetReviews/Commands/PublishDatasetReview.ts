import { Array, Data, Either, Function, Match, Option, pipe } from 'effect'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Events from '../Events.ts'

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
  missing: Array.NonEmptyReadonlyArray<
    'AnsweredIfTheDatasetFollowsFairAndCarePrinciples' | 'AnsweredIfTheDatasetHasEnoughMetadata'
  >
}> {}

export class IsReady extends Data.TaggedClass('IsReady') {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

const requirementToBeReady = [
  'AnsweredIfTheDatasetFollowsFairAndCarePrinciples',
  'AnsweredIfTheDatasetHasEnoughMetadata',
] satisfies ReadonlyArray<NotReady['missing'][number]>

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  if (!Array.some(events, hasTag('DatasetReviewWasStarted'))) {
    return new NotStarted()
  }

  if (Array.some(events, hasTag('DatasetReviewWasPublished'))) {
    return new HasBeenPublished()
  }

  if (Array.some(events, hasTag('PublicationOfDatasetReviewWasRequested'))) {
    return new IsBeingPublished()
  }

  return pipe(
    Array.map(requirementToBeReady, requirement =>
      Either.fromOption(Array.findLast(events, hasTag(requirement)), () => requirement),
    ),
    Array.getLefts,
    Array.match({
      onNonEmpty: missing => new NotReady({ missing }),
      onEmpty: () => new IsReady(),
    }),
  )
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

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
