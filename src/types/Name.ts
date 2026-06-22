import { identity, pipe, Schema, String, type Brand } from 'effect'
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

export const Name = (name: string) => NameSchema.make(name)
