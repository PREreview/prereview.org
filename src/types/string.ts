import type { Eq } from 'fp-ts/Eq'
import type { Ord } from 'fp-ts/Ord'
import { pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

export type NonEmptyString = string & NonEmptyStringBrand

export const NonEmptyStringC = C.fromDecoder(pipe(D.string, D.refine(isNonEmptyString, 'NonEmptyString')))

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.trim().length > 0
}

export const eqNonEmptyString: Eq<NonEmptyString> = s.Eq

export const ordNonEmptyString: Ord<NonEmptyString> = s.Ord

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}
