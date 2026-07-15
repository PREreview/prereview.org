import { Array, Either, Option, Struct, type Types } from 'effect'
import * as Commands from '../../Commands.ts'
import * as Events from '../../Events.ts'
import type { Uuid } from '../../types/Uuid.ts'
import { DatasetReviewHasAlreadyBeenAddedToAClub, UnknownClub, UnknownDatasetReview } from '../Errors.ts'

export interface Input {
  readonly datasetReviewId: Uuid
  readonly clubId: Uuid
}

export type Error = DatasetReviewHasAlreadyBeenAddedToAClub | UnknownClub | UnknownDatasetReview

interface State {
  readonly started: boolean
  readonly inClub: Option.Option<Uuid>
}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['DatasetReviewWasStarted', 'DatasetReviewWasAddedToAClub'],
      predicates: { datasetReviewId: input.datasetReviewId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const started = Array.some(filteredEvents, hasTag('DatasetReviewWasStarted'))

  const inClub = Option.andThen(
    Array.findLast(filteredEvents, hasTag('DatasetReviewWasAddedToAClub')),
    Struct.get('clubId'),
  )

  return { started, inClub }
}

const decide =
  (clubs: ReadonlyArray<Uuid>) =>
  (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
    Either.gen(function* () {
      if (!state.started) {
        return yield* Either.left(new UnknownDatasetReview({}))
      }

      if (Option.isSome(state.inClub)) {
        if (state.inClub.value !== input.clubId) {
          return yield* Either.left(new DatasetReviewHasAlreadyBeenAddedToAClub())
        }

        return Option.none()
      }

      if (!Array.contains(clubs, input.clubId)) {
        return yield* Either.left(new UnknownClub())
      }

      return Option.some(new Events.DatasetReviewWasAddedToAClub(input))
    })

export const AddReviewToAClub = (clubs: ReadonlyArray<Uuid>) =>
  Commands.Command({
    name: 'DatasetReviews.addReviewToAClub',
    createFilter,
    foldState,
    decide: decide(clubs),
  })

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
