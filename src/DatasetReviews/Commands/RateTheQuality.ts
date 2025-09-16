import { Array, Boolean, Data, Either, Equal, Function, Match, Option } from 'effect'
import * as Events from '../../Events.js'
import type { OrcidId, Uuid } from '../../types/index.js'
import * as Errors from '../Errors.js'

export interface Command {
  readonly rating: 'excellent' | 'fair' | 'poor' | 'unsure'
  readonly datasetReviewId: Uuid.Uuid
  readonly userId: OrcidId.OrcidId
}

export type Error =
  | Errors.DatasetReviewHasNotBeenStarted
  | Errors.DatasetReviewIsBeingPublished
  | Errors.DatasetReviewHasBeenPublished

export type State = NotStarted | NotRated | HasBeenRated | IsBeingPublished | HasBeenPublished

export class NotStarted extends Data.TaggedClass('NotStarted') {}

export class NotRated extends Data.TaggedClass('NotRated')<{ authorId: OrcidId.OrcidId }> {}

export class HasBeenRated extends Data.TaggedClass('HasBeenRated')<{
  rating: Events.RatedTheQualityOfTheDataset['rating']
  authorId: OrcidId.OrcidId
}> {}

export class IsBeingPublished extends Data.TaggedClass('IsBeingPublished')<{ authorId: OrcidId.OrcidId }> {}

export class HasBeenPublished extends Data.TaggedClass('HasBeenPublished')<{ authorId: OrcidId.OrcidId }> {}

export const createFilter = (datasetReviewId: Uuid.Uuid): Events.EventFilter<Events.DatasetReviewEvent['_tag']> => ({
  types: [
    'DatasetReviewWasStarted',
    'RatedTheQualityOfTheDataset',
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

      return Option.match(Array.findLast(filteredEvents, hasTag('RatedTheQualityOfTheDataset')), {
        onNone: () => new NotRated({ authorId }),
        onSome: ({ rating }) => new HasBeenRated({ rating, authorId }),
      })
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
      NotRated: () =>
        Either.right(
          Option.some(
            new Events.RatedTheQualityOfTheDataset({
              rating: command.rating,
              datasetReviewId: command.datasetReviewId,
            }),
          ),
        ),
      HasBeenRated: ({ rating }) =>
        Boolean.match(Equal.equals(command.rating, rating), {
          onTrue: () => Either.right(Option.none()),
          onFalse: () =>
            Either.right(
              Option.some(
                new Events.RatedTheQualityOfTheDataset({
                  rating: command.rating,
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
