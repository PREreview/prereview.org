import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { type EmailAddress, EmailAddressC } from './types/email-address'

export type ContactEmailAddress = VerifiedContactEmailAddress | UnverifiedContactEmailAddress

export interface VerifiedContactEmailAddress {
  readonly type: 'verified'
  readonly value: EmailAddress
}

export interface UnverifiedContactEmailAddress {
  readonly type: 'unverified'
  readonly value: EmailAddress
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

export const ContactEmailAddressC = C.struct({
  type: C.literal('verified', 'unverified'),
  value: EmailAddressC,
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
