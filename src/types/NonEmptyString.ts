import { type Brand, Either, Option, pipe, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as EffectToFpts from '../EffectToFpts.ts'

const NonEmptyStringBrand: unique symbol = Symbol.for('NonEmptyString')

export type NonEmptyString = string & Brand.Brand<typeof NonEmptyStringBrand>

export const NonEmptyStringC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s => EffectToFpts.either(Either.fromOption(fromString(s), () => D.error(s, 'NonEmptyString')))),
  ),
)

export const NonEmptyStringSchema = pipe(
  Schema.String,
  Schema.filter(isNonEmptyString, { message: () => 'string is empty' }),
  Schema.brand(NonEmptyStringBrand),
)

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.trim().length > 0
}

export const NonEmptyString = (nonEmptyString: string) => NonEmptyStringSchema.make(nonEmptyString)

export const fromString: (string: string) => Option.Option<NonEmptyString> = Option.liftThrowable(NonEmptyString)
