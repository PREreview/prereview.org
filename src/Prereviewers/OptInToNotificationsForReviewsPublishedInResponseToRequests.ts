import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId, Temporal } from '../types/index.ts'

export interface Input {
  readonly orcidId: OrcidId.OrcidId
  readonly optedInAt: Temporal.Instant
}

type State = PrereviewerHasOptedIn | PrereviewerHasNotOptedIn | UnknownPrereviewer

class PrereviewerHasOptedIn extends Data.TaggedClass('PrereviewerHasOptedIn')<{
  optedInAt: Temporal.Instant
}> {}

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
      ],
      predicates: { orcidId: input.orcidId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (Array.isEmptyArray(filteredEvents)) {
    return new UnknownPrereviewer()
  }

  const optedIn = Array.findLast(
    filteredEvents,
    hasTag('PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests'),
  )

  return Option.match(optedIn, {
    onNone: () => new PrereviewerHasNotOptedIn(),
    onSome: ({ optedInAt }) => new PrereviewerHasOptedIn({ optedInAt }),
  })
}

const decide = (state: State, input: Input) =>
  Match.valueTags(state, {
    PrereviewerHasNotOptedIn: () =>
      Either.right(
        Option.some(new Events.PrereviewerOptedInToNotificationsForReviewsPublishedInResponseToTheirRequests(input)),
      ),
    PrereviewerHasOptedIn: () => Either.right(Option.none()),
    UnknownPrereviewer: Either.left,
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
