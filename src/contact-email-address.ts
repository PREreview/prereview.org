import { Data, flow, Match, pipe } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import { type EmailAddress, EmailAddressC } from './types/EmailAddress.ts'
import { type Uuid, UuidC } from './types/Uuid.ts'

export class ContactEmailAddressIsNotFound extends Data.TaggedError('ContactEmailAddressIsNotFound') {}

export class ContactEmailAddressIsUnavailable extends Data.TaggedError('ContactEmailAddressIsUnavailable')<{
  cause?: unknown
}> {}

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export class VerifiedContactEmailAddress extends Data.TaggedClass('VerifiedContactEmailAddress')<{
  value: EmailAddress
}> {}

export class UnverifiedContactEmailAddress extends Data.TaggedClass('UnverifiedContactEmailAddress')<{
  value: EmailAddress
  verificationToken: Uuid
}> {}

export const ContactEmailAddressC = pipe(
  C.sum('type')({
    verified: pipe(
      C.struct({
        type: C.literal('verified'),
        value: EmailAddressC,
      }),
    ),
    unverified: pipe(
      C.struct({
        type: C.literal('unverified'),
        value: EmailAddressC,
        verificationToken: UuidC,
      }),
    ),
  }),
  C.imap(
    flow(
      Match.value,
      Match.when({ type: 'verified' }, ({ value }) => new VerifiedContactEmailAddress({ value })),
      Match.when(
        { type: 'unverified' },
        ({ value, verificationToken }) => new UnverifiedContactEmailAddress({ value, verificationToken }),
      ),
      Match.exhaustive,
    ),
    flow(
      Match.value,
      Match.tag('VerifiedContactEmailAddress', ({ value }) => ({ type: 'verified' as const, value })),
      Match.tag('UnverifiedContactEmailAddress', ({ value, verificationToken }) => ({
        type: 'unverified' as const,
        value,
        verificationToken,
      })),
      Match.exhaustive,
    ),
  ),
) satisfies C.Codec<unknown, unknown, ContactEmailAddress>
