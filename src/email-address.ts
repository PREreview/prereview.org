import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './string'

export interface GetEmailAddressEnv {
  getEmailAddress: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString>
}

export interface EditEmailAddressEnv extends GetEmailAddressEnv {
  deleteEmailAddress: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveEmailAddress: (orcid: Orcid, EmailAddress: NonEmptyString) => TE.TaskEither<'unavailable', void>
}

export const getEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getEmailAddress }: GetEmailAddressEnv) => getEmailAddress(orcid)))

export const deleteEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteEmailAddress }: EditEmailAddressEnv) => deleteEmailAddress(orcid)),
  )

export const saveEmailAddress = (
  orcid: Orcid,
  emailAddress: NonEmptyString,
): RTE.ReaderTaskEither<EditEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveEmailAddress }) => saveEmailAddress(orcid, emailAddress)))
