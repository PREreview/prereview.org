import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly optedInAt: Temporal.Instant
}

type State = PrereviewerHasOptedIn | PrereviewerHasOptedOut | PrereviewerHasNotOptedIn | UnknownPrereviewer

class PrereviewerHasOptedIn extends Data.TaggedClass('PrereviewerHasOptedIn')<{
  optedInAt: Temporal.Instant
}> {}

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

  if (Array.isEmptyArray(filteredEvents)) {
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
      PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests: event =>
        new PrereviewerHasOptedIn({ optedInAt: event.optedInAt }),
      PrereviewerOptedOutOfNotificationsForReviewsPublishedInResponseToTheirRequests: () =>
        new PrereviewerHasOptedOut(),
    }),
  })
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    PrereviewerHasNotOptedIn: () =>
      Either.right(
        Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
      ),
    PrereviewerHasOptedOut: () =>
      Either.right(
        Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
      ),
    PrereviewerHasOptedIn: () => Either.right(Option.none()),
    UnknownPrereviewer: state => Either.left(state),
  })

export const OptInToNotificationsForReviewsPublishedInResponseToRequests = Commands.Command({
  name: 'Prereviewers.optInToNotificationsForReviewsPublishedInResponseToRequests',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
