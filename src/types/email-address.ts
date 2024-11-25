import { isEmailValid } from '@hapi/address'
import { Schema } from 'effect'
import type { Eq } from 'fp-ts/lib/Eq.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as s from 'fp-ts/lib/string.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { NonEmptyString } from './string.js'

export type EmailAddress = NonEmptyString & EmailAddressBrand

export const EmailAddressC = C.fromDecoder(pipe(D.string, D.refine(isEmailAddress, 'EmailAddress')))

export const EmailAddressSchema: Schema.Schema<EmailAddress, string> = pipe(
  Schema.String,
  Schema.filter(isEmailAddress, { message: () => 'not an email address' }),
)

export const eqEmailAddress: Eq<EmailAddress> = s.Eq

function isEmailAddress(value: string): value is EmailAddress {
  return isEmailValid(value)
}

interface EmailAddressBrand {
  readonly EmailAddress: unique symbol
}
