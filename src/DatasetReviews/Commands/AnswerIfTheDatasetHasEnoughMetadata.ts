import { Data, type Either, Function, type Option } from 'effect'
import type { Uuid } from '../../types/index.js'
import type * as Errors from '../Errors.js'
import type * as Events from '../Events.js'

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
  answer: Events.AnsweredIfTheDatasetFollowsFairAndCarePrinciples['answer']
}> {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished') {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished') {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>): State => {
  throw new Error('not implemented')
}

export const decide: {
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
  (command: Command): (state: State) => Either.Either<Option.Option<Events.DatasetReviewEvent>, Error>
} = Function.dual(
  2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (state: State, command: Command): Either.Either<Option.Option<Events.DatasetReviewEvent>, Error> => {
    throw new Error('not implemented')
  },
)
