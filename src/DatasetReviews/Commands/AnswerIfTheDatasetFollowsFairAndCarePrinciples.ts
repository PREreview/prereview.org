import { Array, Boolean, Data, Either, Equal, Function, Match, Option } from 'effect'
import * as Errors from '../Errors.js'
import * as Events from '../Events.js'

export interface Command {
  readonly answer: 'yes' | 'partly' | 'no' | 'unsure'
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

export type State = NotStarted | NotAnswered | HasBeenAnswered | IsBeingPublished | HasBeenPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotAnswered extends Data.TaggedClass('NotAnswered') {}

export class HasBeenAnswered extends Data.TaggedClass('HasBeenAnswered')<{
  answer: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
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

  if (Array.some(events, hasTag('PublicationWasRequested'))) {
    return new IsBeingPublished()
  }

  return Option.match(Array.findLast(events, hasTag('AnsweredIfTheDatasetFollowsFairAndCarePrinciples')), {
    onNone: () => new NotAnswered(),
    onSome: ({ answer }) => new HasBeenAnswered({ answer }),
  })
}

export const decide: {
  (state: State, command: Command): Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  (state: State, command: Command): Either.Either<ReadonlyArray<Events.DatasetReviewEvent>, Error> =>
    Match.valueTags(state, {
      NotStarted: () => Either.left(new Errors.DatasetReviewHasNotBeenStarted()),
      IsBeingPublished: () => Either.left(new Errors.DatasetReviewIsBeingPublished()),
      HasBeenPublished: () => Either.left(new Errors.DatasetReviewHasBeenPublished()),
      NotAnswered: () =>
        Either.right(Array.of(new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: command.answer }))),
      HasBeenAnswered: ({ answer }) =>
        Boolean.match(Equal.equals(command.answer, answer), {
          onTrue: () => Either.right(Array.empty()),
          onFalse: () =>
            Either.right(
              Array.of(new Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples({ answer: command.answer })),
            ),
        }),
    }),
)

function hasTag<Tag extends T['_tag'], T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
