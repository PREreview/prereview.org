import { Array, Data, Result, Match, Option, type Types } from 'effect'
import * as Events from '../../Events.ts'
import * as Queries from '../../Queries.ts'
import type { OrcidId } from '../../types/index.ts'

export type Input = OrcidId.OrcidId

export type Result = Result.Result<HasNotOptedIn | HasOptedIn | HasOptedOut, UnknownPrereviewer>

export class HasNotOptedIn extends Data.TaggedClass('HasNotOptedIn') {}

export class HasOptedIn extends Data.TaggedClass('HasOptedIn') {}

export class HasOptedOut extends Data.TaggedClass('HasOptedOut') {}

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer')<{ cause?: unknown }> {}

const createFilter = (orcidId: Input) =>
  Events.EventFilter([
    {
      types: [
        'RegisteredPrereviewerImported',
        'PrereviewerRegistered',
        'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
        'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
      ],
      predicates: { orcidId },
    },
  ])

const query = (events: ReadonlyArray<Events.Event>, input: Input): Result =>
  Result.gen(function* () {
    const filter = createFilter(input)

    const filteredEvents = Array.filter(events, Events.matches(filter))

    if (Array.isArrayEmpty(filteredEvents)) {
      return yield* Result.fail(new UnknownPrereviewer({}))
    }

    const lastChoice = Array.findLast(
      filteredEvents,
      hasTag(
        'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
        'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
      ),
    )

    return Option.match(lastChoice, {
      onNone: () => new HasNotOptedIn(),
      onSome: Match.valueTags({
        PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests: () => new HasOptedIn(),
        PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests: () => new HasOptedOut(),
      }),
    })
  })

export const HasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests = Queries.OnDemandQuery({
  name: 'Prereviewers.hasAPrereviewerOptedInToNotificationsForReviewsPublishedInResponseToRequests',
  createFilter,
  query,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
