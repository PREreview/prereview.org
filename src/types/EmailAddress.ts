import { isEmailValid } from '@hapi/address'
import { Either, Schema, pipe } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'

const EmailAddressBrand: unique symbol = Symbol.for('EmailAddress')

export type EmailAddress = typeof EmailAddressSchema.Type

export const EmailAddressC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s =>
      EffectToFpts.either(
        Either.try({
          try: () => EmailAddressSchema.make(s),
          catch: () => D.error(s, 'EmailAddress'),
        }),
      ),
    ),
  ),
)

export const EmailAddressSchema = pipe(
  Schema.String,
  Schema.filter(s => isEmailValid(s), { message: () => 'not an email address' }),
  Schema.brand(EmailAddressBrand),
)

export const EmailAddress = (email: string) => EmailAddressSchema.make(email)
