import { Array, Data, Result, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly optedOutAt: Temporal.Instant
}

type State = PrereviewerHasOptedIn | PrereviewerHasOptedOut | PrereviewerHasNotOptedIn | UnknownPrereviewer

class PrereviewerHasOptedIn extends Data.TaggedClass('PrereviewerHasOptedIn') {}

class PrereviewerHasOptedOut extends Data.TaggedClass('PrereviewerHasOptedOut') {}

class PrereviewerHasNotOptedIn extends Data.TaggedClass('PrereviewerHasNotOptedIn') {}

export type Error = UnknownPrereviewer

export class UnknownPrereviewer extends Data.TaggedError('UnknownPrereviewer') {}

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: [
        'RegisteredPrereviewerImported',
        'PrereviewerRegistered',
        'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
        'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
      ],
      predicates: { orcidId: input.orcidId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (Array.isArrayEmpty(filteredEvents)) {
    return new UnknownPrereviewer()
  }

  const lastChoice = Array.findLast(
    filteredEvents,
    hasTag(
      'PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests',
      'PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests',
    ),
  )

  return Option.match(lastChoice, {
    onNone: () => new PrereviewerHasNotOptedIn(),
    onSome: Match.valueTags({
      PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests: () => new PrereviewerHasOptedIn(),
      PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests: () =>
        new PrereviewerHasOptedOut(),
    }),
  })
}

const decide = (state: State, input: Input): Result.Result<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    PrereviewerHasNotOptedIn: () =>
      Result.succeed(
        Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
      ),
    PrereviewerHasOptedOut: () => Result.succeed(Option.none()),
    PrereviewerHasOptedIn: () =>
      Result.succeed(
        Option.some(new Events.PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
      ),
    UnknownPrereviewer: state => Result.fail(state),
  })

export const OptOutOfNotificationsForReviewsPublishedInResponseToRequests = Commands.Command({
  name: 'Prereviewers.optOutOfNotificationsForReviewsPublishedInResponseToRequests',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
