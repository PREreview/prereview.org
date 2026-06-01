import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
  readonly persona: 'public' | 'pseudonym'
}

export class PersonaDoesNotNeedToBeChosen extends Data.TaggedError('PersonaDoesNotNeedToBeChosen') {}

export class PersonaCannotBeChanged extends Data.TaggedError('PersonaCannotBeChanged') {}

export type Error = PersonaDoesNotNeedToBeChosen | PersonaCannotBeChanged

type State = NoInvitationAccepted | StartedTheReview | NotChosen | HasBeenChosen | HasBeenConfirmed

class NoInvitationAccepted extends Data.TaggedClass('NoInvitationAccepted') {}
class StartedTheReview extends Data.TaggedClass('StartedTheReview') {}
class NotChosen extends Data.TaggedClass('NotChosen') {}
class HasBeenChosen extends Data.TaggedClass('HasBeenChosen')<{ persona: 'public' | 'pseudonym' }> {}
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
    AuthorInviteAccepted: () => new NotChosen(),
    PersonaForAReviewChosen: ({ persona }) => new HasBeenChosen({ persona }),
    AuthorChoicesForAReviewConfirmed: () => new HasBeenConfirmed(),
  })
}
const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NoInvitationAccepted: () => Either.left(new PersonaDoesNotNeedToBeChosen()),
    StartedTheReview: () => Either.left(new PersonaCannotBeChanged()),
    NotChosen: () => Either.right(Option.some(new Events.PersonaForAReviewChosen(input))),
    HasBeenChosen: ({ persona }) =>
      Either.right(persona === input.persona ? Option.none() : Option.some(new Events.PersonaForAReviewChosen(input))),
    HasBeenConfirmed: () => Either.left(new PersonaCannotBeChanged()),
  })

export const ChoosePersona = Commands.Command({
  name: 'AuthorInvites.choosePersona',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
