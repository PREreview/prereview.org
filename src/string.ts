import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'

export type NonEmptyString = string & NonEmptyStringBrand

export const NonEmptyStringC = C.fromDecoder(pipe(D.string, D.refine(isNonEmptyString, 'NonEmptyString')))

export function isNonEmptyString(value: string): value is NonEmptyString {
  return value.length > 0
}

interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol
}
