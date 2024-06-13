import { isEmailValid } from '@hapi/address'
import type { Eq } from 'fp-ts/Eq'
import { pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { NonEmptyString } from './string.js'

export type EmailAddress = NonEmptyString & EmailAddressBrand

export const EmailAddressC = C.fromDecoder(pipe(D.string, D.refine(isEmailAddress, 'EmailAddress')))

export const eqEmailAddress: Eq<EmailAddress> = s.Eq

function isEmailAddress(value: string): value is EmailAddress {
  return isEmailValid(value)
}

interface EmailAddressBrand {
  readonly EmailAddress: unique symbol
}
