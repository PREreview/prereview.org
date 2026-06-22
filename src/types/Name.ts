import { Either, identity, pipe, Schema, String, type Brand } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { EffectToFpts } from '../RefactoringUtilities/index.ts'
import { NonEmptyStringSchema, type NonEmptyString } from './NonEmptyString.ts'

const NameBrand: unique symbol = Symbol.for('Name')

export type Name = NonEmptyString & Brand.Brand<typeof NameBrand>

const NormalizedWhitespaceSchema = Schema.transform(Schema.String, Schema.Trim, {
  strict: true,
  decode: String.replaceAll(/\s+/g, ' '),
  encode: identity,
})

export const NameSchema = pipe(
  Schema.compose(NormalizedWhitespaceSchema, NonEmptyStringSchema),
  Schema.brand(NameBrand),
).annotations({
  arbitrary: () => fc =>
    fc
      .string({ minLength: 1 })
      .map(string => string.replaceAll(/\s+/g, ' ').trim())
      .filter(Schema.is(NameSchema)),
})

export const NameC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s => EffectToFpts.either(Either.mapLeft(Schema.decodeEither(NameSchema)(s), () => D.error(s, 'Name')))),
  ),
)

export const Name = (name: string) => NameSchema.make(name)
