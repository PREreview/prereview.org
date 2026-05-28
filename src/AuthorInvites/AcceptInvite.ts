import { Data, Either, type Option } from 'effect'
import * as Commands from '../Commands.ts'
import * as Events from '../Events.ts'
import type { OrcidId } from '../types/OrcidId.ts'
import type { Instant } from '../types/Temporal.ts'
import type { Uuid } from '../types/Uuid.ts'

export interface Input {
  readonly invitationId: Uuid
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
    },
  ])

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const foldState = (events: ReadonlyArray<Events.Event>, input: Input): State => new NoSuchInvitation()

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const decide = (state: State, input: Input): Either.Either<Option.Option<Events.Event>, Error> =>
  Either.left(new InvitationNotFound())

export const AcceptInvite = Commands.Command({
  name: 'AuthorInvites.acceptInvite',
  createFilter,
  foldState,
  decide,
})
