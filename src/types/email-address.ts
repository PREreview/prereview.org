import { isEmailValid } from '@hapi/address'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { NonEmptyString } from './string'

export type EmailAddress = NonEmptyString & EmailAddressBrand

export const EmailAddressC = C.fromDecoder(pipe(D.string, D.refine(isEmailAddress, 'EmailAddress')))

function isEmailAddress(value: string): value is EmailAddress {
  return isEmailValid(value)
}

interface EmailAddressBrand {
  readonly EmailAddress: unique symbol
}
