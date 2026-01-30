import { Array, Boolean, Data, Either, Equal, Function, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import type { OrcidId, Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'

export interface Command {
  readonly timestamp: Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview['timestamp']
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

export type State = NotStarted | NotDeclared | HasBeenDeclared | IsBeingPublished | HasBeenPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotDeclared extends Data.TaggedClass('NotDeclared')<{ authorId: OrcidId.OrcidId }> {}

export class HasBeenDeclared extends Data.TaggedClass('HasBeenDeclared')<{ authorId: OrcidId.OrcidId }> {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished')<{ authorId: OrcidId.OrcidId }> {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished')<{ authorId: OrcidId.OrcidId }> {}

export const createFilter = (
  datasetReviewId: Uuid.Uuid,
): Events.EventFilter<Types.Tags<Events.DatasetReviewEvent>> => ({
  types: [
    'DatasetReviewWasStarted',
    'DeclaredThatTheCodeOfConductWasFollowedForADatasetReview',
    'PublicationOfDatasetReviewWasRequested',
    'DatasetReviewWasPublished',
  ],
  predicates: { datasetReviewId },
})

export const foldState = (events: ReadonlyArray<Events.DatasetReviewEvent>, datasetReviewId: Uuid.Uuid): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(datasetReviewId)))

  return Option.match(Array.findLast(filteredEvents, hasTag('DatasetReviewWasStarted')), {
    onNone: () => new NotStarted(),
    onSome: ({ authorId }) => {
      if (Array.some(filteredEvents, hasTag('DatasetReviewWasPublished'))) {
        return new HasBeenPublished({ authorId })
      }

      if (Array.some(filteredEvents, hasTag('PublicationOfDatasetReviewWasRequested'))) {
        return new IsBeingPublished({ authorId })
      }

      return Boolean.match(
        Array.some(filteredEvents, hasTag('DeclaredThatTheCodeOfConductWasFollowedForADatasetReview')),
        {
          onFalse: () => new NotDeclared({ authorId }),
          onTrue: () => new HasBeenDeclared({ authorId }),
        },
      )
    },
  })
}

export const authorize: {
  (state: State, command: Command): boolean
  (command: Command): (state: State) => boolean
} = Function.dual(
  2,
  (state: State, { userId }: Command): boolean => state._tag === 'NotStarted' || Equal.equals(state.authorId, userId),
)

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
      NotDeclared: () =>
        Either.right(
          Option.some(
            new Events.DeclaredThatTheCodeOfConductWasFollowedForADatasetReview({
              timestamp: command.timestamp,
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      HasBeenDeclared: () => Either.right(Option.none()),
    }),
)

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Extract<T, { _tag: Tag }> => Array.contains(tags, tagged._tag)
}
