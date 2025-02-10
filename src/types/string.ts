import { pipe, Schema, String } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as EffectToFpTs from '../EffectToFpts.js'

export type NonEmptyString = string & NonEmptyStringBrand

export const NonEmptyStringC = C.fromDecoder(pipe(D.string, D.refine(isNonEmptyString, 'NonEmptyString')))

export const NonEmptyStringSchema: Schema.Schema<NonEmptyString, string> = pipe(
  Schema.String,
  Schema.filter(isNonEmptyString, { message: () => 'string is empty' }),
)

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.trim().length > 0
}

export const ordNonEmptyString = EffectToFpTs.ord<NonEmptyString>(String.Order)

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}
