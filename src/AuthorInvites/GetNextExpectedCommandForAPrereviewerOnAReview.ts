import { Array, Data, Either, type Types } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Either.Either<NextExpectedCommand, Error>

export type NextExpectedCommand = 'ChoosePersona' | 'ConfirmAuthorChoices'

export type Error = PrereviewerIsNotListedOnTheReview | NothingToDo

export class NothingToDo extends Data.TaggedError('NothingToDo') {}

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

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
      return yield* Either.left(new NothingToDo())
    }

    if (Array.some(filteredEvents, hasTag('AuthorChoicesForAReviewConfirmed'))) {
      return yield* Either.left(new NothingToDo())
    }

    if (!Array.some(filteredEvents, hasTag('PersonaForAReviewChosen'))) {
      return 'ChoosePersona'
    }

    return 'ConfirmAuthorChoices'
  })

export const GetNextExpectedCommandForAPrereviewerOnAReview = Queries.OnDemandQuery({
  name: 'AuthorInvites.getNextExpectedCommandForAPrereviewerOnAReview',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
