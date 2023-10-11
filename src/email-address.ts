import { isEmailValid } from '@hapi/address'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './string'

export type EmailAddress = NonEmptyString & EmailAddressBrand

export interface GetEmailAddressEnv {
  getEmailAddress: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', EmailAddress>
}

export interface EditEmailAddressEnv extends GetEmailAddressEnv {
  deleteEmailAddress: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveEmailAddress: (orcid: Orcid, EmailAddress: EmailAddress) => TE.TaskEither<'unavailable', void>
}

export const EmailAddressC = C.fromDecoder(pipe(D.string, D.refine(isEmailAddress, 'EmailAddress')))

export const getEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getEmailAddress }: GetEmailAddressEnv) => getEmailAddress(orcid)))

export const deleteEmailAddress = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteEmailAddress }: EditEmailAddressEnv) => deleteEmailAddress(orcid)),
  )

export const saveEmailAddress = (
  orcid: Orcid,
  emailAddress: EmailAddress,
): RTE.ReaderTaskEither<EditEmailAddressEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveEmailAddress }) => saveEmailAddress(orcid, emailAddress)))

function isEmailAddress(value: string): value is EmailAddress {
  return isEmailValid(value)
}

interface EmailAddressBrand {
  readonly EmailAddress: unique symbol
}
