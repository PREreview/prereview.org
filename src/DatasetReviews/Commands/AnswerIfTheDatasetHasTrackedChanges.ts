import { Array, Boolean, Data, Either, Equal, Function, Match, Option } from 'effect'
import type { Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'
import * as Events from '../Events.js'

export interface Command {
  readonly answer: 'yes' | 'partly' | 'no' | 'unsure'
  readonly datasetReviewId: Uuid.Uuid
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

export type State = NotStarted | NotAnswered | HasBeenAnswered | IsBeingPublished | HasBeenPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotAnswered extends Data.TaggedClass('NotAnswered') {}

export class HasBeenAnswered extends Data.TaggedClass('HasBeenAnswered')<{
  answer: Events.AnsweredIfTheDatasetHasTrackedChanges['answer']
}> {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

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

  return Option.match(Array.findLast(events, hasTag('AnsweredIfTheDatasetHasTrackedChanges')), {
    onNone: () => new NotAnswered(),
    onSome: ({ answer }) => new HasBeenAnswered({ answer }),
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
      IsBeingPublished: () => Either.left(new Errors.DatasetReviewIsBeingPublished()),
      HasBeenPublished: () => Either.left(new Errors.DatasetReviewHasBeenPublished()),
      NotAnswered: () =>
        Either.right(
          Option.some(
            new Events.AnsweredIfTheDatasetHasTrackedChanges({
              answer: command.answer,
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      HasBeenAnswered: ({ answer }) =>
        Boolean.match(Equal.equals(command.answer, answer), {
          onTrue: () => Either.right(Option.none()),
          onFalse: () =>
            Either.right(
              Option.some(
                new Events.AnsweredIfTheDatasetHasTrackedChanges({
                  answer: command.answer,
                  datasetReviewId: command.datasetReviewId,
                }),
              ),
            ),
        }),
    }),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
