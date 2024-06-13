import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { Refinement } from 'fp-ts/lib/Refinement.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { flow } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type { Uuid } from 'uuid-ts'
import { type EmailAddress, EmailAddressC } from './types/email-address.js'
import type { IndeterminatePreprintId } from './types/preprint-id.js'
import { UuidC } from './types/uuid.js'
import type { User } from './user.js'

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export interface VerifiedContactEmailAddress {
  readonly type: 'verified'
  readonly value: EmailAddress
}

export interface UnverifiedContactEmailAddress {
  readonly type: 'unverified'
  readonly value: EmailAddress
  readonly verificationToken: Uuid
}

export interface GetContactEmailAddressEnv {
  getContactEmailAddress: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', ContactEmailAddress>
}

export interface SaveContactEmailAddressEnv {
  saveContactEmailAddress: (
    orcid: Orcid,
    ContactEmailAddress: ContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressEnv {
  verifyContactEmailAddress: (
    user: User,
    emailAddress: UnverifiedContactEmailAddress,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForReviewEnv {
  verifyContactEmailAddressForReview: (
    user: User,
    emailAddress: UnverifiedContactEmailAddress,
    preprint: IndeterminatePreprintId,
  ) => TE.TaskEither<'unavailable', void>
}

export interface VerifyContactEmailAddressForInvitedAuthorEnv {
  verifyContactEmailAddressForInvitedAuthor: (verify: {
    user: User
    emailAddress: UnverifiedContactEmailAddress
    authorInvite: Uuid
  }) => TE.TaskEither<'unavailable', void>
}

export const ContactEmailAddressC = C.sum('type')({
  verified: C.struct({
    type: C.literal('verified'),
    value: EmailAddressC,
  }),
  unverified: C.struct({
    type: C.literal('unverified'),
    value: EmailAddressC,
    verificationToken: UuidC,
  }),
}) satisfies C.Codec<unknown, unknown, ContactEmailAddress>

export const getContactEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getContactEmailAddress }: GetContactEmailAddressEnv) => getContactEmailAddress(orcid)),
  )

export const maybeGetContactEmailAddress = flow(
  getContactEmailAddress,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveContactEmailAddress = (
  orcid: Orcid,
  emailAddress: ContactEmailAddress,
): RTE.ReaderTaskEither<SaveContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveContactEmailAddress }) => saveContactEmailAddress(orcid, emailAddress)),
  )

export const verifyContactEmailAddress = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
): RTE.ReaderTaskEither<VerifyContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddress }) => verifyContactEmailAddress(user, emailAddress)),
  )

export const verifyContactEmailAddressForReview = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
  preprint: IndeterminatePreprintId,
): RTE.ReaderTaskEither<VerifyContactEmailAddressForReviewEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddressForReview }) =>
      verifyContactEmailAddressForReview(user, emailAddress, preprint),
    ),
  )

export const verifyContactEmailAddressForInvitedAuthor = (verify: {
  user: User
  emailAddress: UnverifiedContactEmailAddress
  authorInvite: Uuid
}): RTE.ReaderTaskEither<VerifyContactEmailAddressForInvitedAuthorEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ verifyContactEmailAddressForInvitedAuthor }) =>
      verifyContactEmailAddressForInvitedAuthor(verify),
    ),
  )

export const isUnverified: Refinement<ContactEmailAddress, UnverifiedContactEmailAddress> = (
  emailAddress: ContactEmailAddress,
): emailAddress is UnverifiedContactEmailAddress => emailAddress.type === 'unverified'
