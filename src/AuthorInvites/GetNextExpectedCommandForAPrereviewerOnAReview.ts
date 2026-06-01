import { Array, Data, Either, Option, type Types } from 'effect'
import * as Events from '../Events.ts'
import * as Queries from '../Queries.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Either.Either<Option.Option<NextExpectedCommand>, Error>

export type NextExpectedCommand = 'ChoosePersona'

export type Error = PrereviewerIsNotListedOnTheReview

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['AuthorInviteAccepted', 'PersonaForAReviewChosen'],
      predicates: { reviewId: input.reviewId, orcidId: input.orcidId },
    },
    {
      types: ['DatasetReviewWasStarted'],
      predicates: { datasetReviewId: input.reviewId, orcidId: input.orcidId },
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
      return Option.none()
    }

    if (!Array.some(filteredEvents, hasTag('PersonaForAReviewChosen'))) {
      return Option.some('ChoosePersona')
    }

    return Option.none()
  })

export const GetNextExpectedCommandForAPrereviewerOnAReview = Queries.OnDemandQuery({
  name: 'AuthorInvites.getNextExpectedCommandForAPrereviewerOnAReview',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
