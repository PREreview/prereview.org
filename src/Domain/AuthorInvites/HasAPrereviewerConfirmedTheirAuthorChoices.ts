import { Array, Data, Result, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/OrcidId.ts'
import type { Uuid } from '../../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
}

export type Result = Result.Result<boolean, Error>

export type Error = PrereviewerIsNotListedOnTheReview

export class PrereviewerIsNotListedOnTheReview extends Data.TaggedError('PrereviewerIsNotListedOnTheReview') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: ['AuthorInviteAccepted', 'AuthorChoicesForAReviewConfirmed'],
      predicates: { reviewId: input.reviewId, orcidId: input.orcidId },
    },
    {
      types: ['DatasetReviewWasStarted'],
      predicates: { datasetReviewId: input.reviewId, authorId: input.orcidId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (Array.isArrayEmpty(filteredEvents)) {
      return yield* Result.fail(new PrereviewerIsNotListedOnTheReview())
    }

    if (Array.some(filteredEvents, hasTag('DatasetReviewWasStarted'))) {
      return true
    }

    return Array.some(filteredEvents, hasTag('AuthorChoicesForAReviewConfirmed'))
  })

export const HasAPrereviewerConfirmedTheirAuthorChoices = Queries.OnDemandQuery({
  name: 'AuthorInvites.hasAPrereviewerConfirmedTheirAuthorChoices',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
