import * as RTE from 'fp-ts/ReaderTaskEither'
import type { Refinement } from 'fp-ts/Refinement'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { type Uuid, isUuid } from 'uuid-ts'
import { type EmailAddress, EmailAddressC } from './types/email-address'
import type { IndeterminatePreprintId } from './types/preprint-id'
import type { User } from './user'

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

export interface EditContactEmailAddressEnv extends GetContactEmailAddressEnv {
  deleteContactEmailAddress: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
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

const UuidC = C.make(
  pipe(
    D.string,
    D.parse(s => {
      if (s.toLowerCase() === s) {
        return D.fromRefinement(isUuid, 'UUID').decode(s)
      }

      return D.failure(s, 'UUID')
    }),
  ),
  { encode: uuid => uuid.toLowerCase() },
)

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

export const deleteContactEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteContactEmailAddress }: EditContactEmailAddressEnv) =>
      deleteContactEmailAddress(orcid),
    ),
  )

export const saveContactEmailAddress = (
  orcid: Orcid,
  emailAddress: ContactEmailAddress,
): RTE.ReaderTaskEither<EditContactEmailAddressEnv, 'unavailable', void> =>
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

export const isUnverified: Refinement<ContactEmailAddress, UnverifiedContactEmailAddress> = (
  emailAddress: ContactEmailAddress,
): emailAddress is UnverifiedContactEmailAddress => emailAddress.type === 'unverified'
