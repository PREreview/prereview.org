import { Data } from 'effect'

export class ContactEmailAddressIsNotFound extends Data.TaggedError('ContactEmailAddressIsNotFound') {}

export class OnlyCurrentContactAddressCanBeVerified extends Data.TaggedError(
  'OnlyCurrentContactAddressCanBeVerified',
) {}

export class ContactEmailAddressHasAlreadyBeenVerified extends Data.TaggedError(
  'ContactEmailAddressHasAlreadyBeenVerified',
) {}

export class VerificationTokenInvalid extends Data.TaggedError('VerificationTokenInvalid') {}

export class AcceptedInvitationIsNotFound extends Data.TaggedError('AcceptedInvitationIsNotFound') {}
