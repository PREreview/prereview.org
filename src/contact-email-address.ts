import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { EmailAddress } from './email-address'

export interface GetContactEmailAddressEnv {
  getContactEmailAddress: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', EmailAddress>
}

export interface EditContactEmailAddressEnv extends GetContactEmailAddressEnv {
  deleteContactEmailAddress: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveContactEmailAddress: (orcid: Orcid, ContactEmailAddress: EmailAddress) => TE.TaskEither<'unavailable', void>
}

export const getContactEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getContactEmailAddress }: GetContactEmailAddressEnv) => getContactEmailAddress(orcid)),
  )

export const deleteContactEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteContactEmailAddress }: EditContactEmailAddressEnv) =>
      deleteContactEmailAddress(orcid),
    ),
  )

export const saveContactEmailAddress = (
  orcid: Orcid,
  emailAddress: EmailAddress,
): RTE.ReaderTaskEither<EditContactEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveContactEmailAddress }) => saveContactEmailAddress(orcid, emailAddress)),
  )
