import { Array, Data, Either, Match, Option, type Types } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Instant } from '../types/Temporal.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly invitationId: Uuid
  readonly reviewId: Uuid
  readonly orcidId: OrcidId
  readonly acceptedAt: Instant
}

export class InvitationNotFound extends Data.TaggedError('InvitationNotFound') {}

export class InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer extends Data.TaggedError(
  'InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer',
) {}

export type Error = InvitationNotFound | InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer

class NoSuchInvitation extends Data.TaggedClass('NoSuchInvitation') {}
class PendingInvitation extends Data.TaggedClass('PendingInvitation') {}
class OpenInvitation extends Data.TaggedClass('OpenInvitation') {}
class AcceptedInvitation extends Data.TaggedClass('AcceptedInvitation')<{ acceptedBy: OrcidId }> {}

type State = NoSuchInvitation | PendingInvitation | OpenInvitation | AcceptedInvitation

const createFilter = (input: Input) =>
  Events.EventFilter([
    {
      types: [
        'InvitationToAppearOnADatasetReviewAddedToTheList',
        'InvitationToAppearOnADatasetReviewRemovedFromTheList',
        'AuthorInviteAccepted',
      ],
      predicates: { invitationId: input.invitationId },
    },
    {
      types: ['PublicationOfDatasetReviewWasRequested'],
      predicates: { datasetReviewId: input.reviewId },
    },
  ])

const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => {
  const filteredEvents = Array.filter(events, Events.matches(createFilter(input)))

  const eventWeAreInterestedIn = Array.findLast(
    filteredEvents,
    hasTag(
      'InvitationToAppearOnADatasetReviewAddedToTheList',
      'InvitationToAppearOnADatasetReviewRemovedFromTheList',
      'AuthorInviteAccepted',
    ),
  )

  if (Option.isNone(eventWeAreInterestedIn)) {
    return new NoSuchInvitation()
  }

  if (eventWeAreInterestedIn.value._tag === 'AuthorInviteAccepted') {
    return new AcceptedInvitation({ acceptedBy: eventWeAreInterestedIn.value.orcidId })
  }

  if (eventWeAreInterestedIn.value._tag === 'InvitationToAppearOnADatasetReviewRemovedFromTheList') {
    return new NoSuchInvitation()
  }

  const datasetReviewId = eventWeAreInterestedIn.value.datasetReviewId

  if (
    !Array.some(
      filteredEvents,
      event => event._tag === 'PublicationOfDatasetReviewWasRequested' && event.datasetReviewId === datasetReviewId,
    )
  ) {
    return new PendingInvitation()
  }

  return new OpenInvitation()
}

const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Match.valueTags(state, {
    NoSuchInvitation: () => Either.left(new InvitationNotFound()),
    PendingInvitation: () => Either.left(new InvitationNotFound()),
    OpenInvitation: () => Either.right(Option.some(new Events.AuthorInviteAccepted(input))),
    AcceptedInvitation: ({ acceptedBy }) =>
      acceptedBy === input.orcidId
        ? Either.right(Option.none())
        : Either.left(new InvitationHasAlreadyBeenAcceptedByAnotherPrereviewer()),
  })

export const AcceptInvite = Commands.Command({
  name: 'AuthorInvites.acceptInvite',
  createFilter,
  foldState,
  decide,
})

function hasTag<Tag extends Types.Tags<T>, T extends { _tag: string }>(...tags: ReadonlyArray<Tag>) {
  return (tagged: T): tagged is Types.ExtractTag<T, Tag> => Array.contains(tags, tagged._tag)
}
