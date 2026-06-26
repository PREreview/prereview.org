import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'
import type { Temporal } from '../types/index.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
  readonly confirmedAt: Temporal.Instant
}

export class ChoicesDoNotNeedToBeConfirmed extends Data.TaggedError('ChoicesDoNotNeedToBeConfirmed') {}

export class ChoicesCannotBeChanged extends Data.TaggedError('ChoicesCannotBeChanged') {}

export type Error = ChoicesDoNotNeedToBeConfirmed | ChoicesCannotBeChanged

type State = NoInvitationAccepted | StartedTheReview | ChoicesIncomplete | ChoicesComplete | HasBeenConfirmed

class NoInvitationAccepted extends Data.TaggedClass('NoInvitationAccepted') {}
class StartedTheReview extends Data.TaggedClass('StartedTheReview') {}
class ChoicesIncomplete extends Data.TaggedClass('ChoicesIncomplete') {}
class ChoicesComplete extends Data.TaggedClass('ChoicesComplete') {}
class HasBeenConfirmed extends Data.TaggedClass('HasBeenConfirmed') {}

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

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  if (Array.some(filteredEvents, hasTag('DatasetReviewWasStarted'))) {
    return new StartedTheReview()
  }

  const eventWeAreInterestedIn = Array.findLast(
    filteredEvents,
    hasTag('AuthorInviteAccepted', 'PersonaForAReviewChosen', 'AuthorChoicesForAReviewConfirmed'),
  )

  if (Option.isNone(eventWeAreInterestedIn)) {
    return new NoInvitationAccepted()
  }

  return Match.valueTags(eventWeAreInterestedIn.value, {
    AuthorInviteAccepted: () => new ChoicesIncomplete(),
    PersonaForAReviewChosen: () => new ChoicesComplete(),
    AuthorChoicesForAReviewConfirmed: () => new HasBeenConfirmed(),
  })
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NoInvitationAccepted: () => Either.left(new ChoicesDoNotNeedToBeConfirmed()),
    StartedTheReview: () => Either.left(new ChoicesCannotBeChanged()),
    ChoicesIncomplete: () => Either.left(new ChoicesDoNotNeedToBeConfirmed()),
    ChoicesComplete: () => Either.right(Option.some(new Events.AuthorChoicesForAReviewConfirmed(input))),
    HasBeenConfirmed: () => Either.left(new ChoicesCannotBeChanged()),
  })

export const ConfirmAuthorChoices = Commands.Command({
  name: 'AuthorInvites.confirmAuthorChoices',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
