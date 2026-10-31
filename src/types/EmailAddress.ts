import { isEmailValid } from '@hapi/address'
import { Result, Equivalence, Schema, String, Tuple, flow, pipe, SchemaTransformation } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'

export type EmailAddress = typeof EmailAddressSchema.Type

export const EmailAddressC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s =>
      EffectToFpts.either(
        Result.try({
          try: () => EmailAddressSchema.make(s),
          catch: () => D.error(s, 'EmailAddress'),
        }),
      ),
    ),
  ),
)

export const EmailAddressSchema = pipe(
  Schema.String,
  Schema.check(
    Schema.makeFilter(s => isEmailValid(s) && !/[\u200b-\u200d\u2060]/.test(s), { message: 'not an email address' }),
  ),
  Schema.brand('EmailAddress'),
)

export const EmailAddressFromUrlSchema = Schema.TemplateLiteralParser([
  'mailto:',
  Schema.StringFromUriComponent.pipe(Schema.decodeTo(EmailAddressSchema)),
]).pipe(
  Schema.decodeTo(
    Schema.toType(EmailAddressSchema),
    SchemaTransformation.transform({ decode: Tuple.get(1), encode: id => ['mailto:', id] as const }),
  ),
)

export const EmailAddress = (email: string) => EmailAddressSchema.make(email)

export const EmailAddressEquivalence: Equivalence.Equivalence<EmailAddress> = Equivalence.mapInput(
  String.Equivalence,
  String.toLowerCase,
)

export const isEmailAddress: (value: string) => value is EmailAddress = Schema.is(EmailAddressSchema)

export const toUrl: (emailAddress: EmailAddress) => URL = flow(
  Schema.encodeSync(EmailAddressFromUrlSchema),
  url => new URL(url),
)
