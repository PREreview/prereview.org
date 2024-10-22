import { Schema } from 'effect'
import type { Eq } from 'fp-ts/lib/Eq.js'
import type { Ord } from 'fp-ts/lib/Ord.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as s from 'fp-ts/lib/string.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'

export type NonEmptyString = string & NonEmptyStringBrand

export const NonEmptyStringC = C.fromDecoder(pipe(D.string, D.refine(isNonEmptyString, 'NonEmptyString')))

export const NonEmptyStringSchema: Schema.Schema<NonEmptyString, string> = pipe(
  Schema.String,
  Schema.filter(isNonEmptyString, { message: () => 'string is empty' }),
)

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.trim().length > 0
}

export const eqNonEmptyString: Eq<NonEmptyString> = s.Eq

export const ordNonEmptyString: Ord<NonEmptyString> = s.Ord

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}
