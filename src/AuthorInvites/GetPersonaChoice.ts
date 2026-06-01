import { Array, Data, Either, Option, Struct, type Types } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Either.Either<Option.Option<'public' | 'pseudonym'>, Error>

export type Error = PrereviewerIsNotListedOnTheReview | PersonaCannotBeChanged

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

export class PersonaCannotBeChanged extends Data.TaggedError('PersonaCannotBeChanged') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'],
      predicates: { reviewId: input.reviewId, orcidId: input.orcidId },
    },
    {
      types: ['DatasetReviewWasStarted'],
      predicates: { datasetReviewId: input.reviewId, authorId: input.orcidId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Either.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (Array.isEmptyArray(filteredEvents)) {
      return yield* Either.left(new PrereviewerIsNotListedOnTheReview())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasStarted'))) {
      return yield* Either.left(new PersonaCannotBeChanged())
    }

    if (Array.some(filteredEvents, hasTag('AuthorChoicesForAReviewConfirmed'))) {
      return yield* Either.left(new PersonaCannotBeChanged())
    }

    return Option.andThen(Array.findLast(filteredEvents, hasTag('PersonaForAReviewChosen')), Struct.get('persona'))
  })

export const GetPersonaChoice = Queries.OnDemandQuery({
  name: 'AuthorInvites.getPersonaChoice',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
