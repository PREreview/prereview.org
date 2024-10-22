import { animals, colors } from 'anonymus'
import { capitalCase } from 'case-anything'
import { Schema } from 'effect'
import { pipe } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { NonEmptyString } from './string.js'

export type Pseudonym = NonEmptyString & PseudonymBrand

export const PseudonymC = C.fromDecoder(pipe(D.string, D.refine(isPseudonym, 'Pseudonym')))

export const PseudonymSchema: Schema.Schema<Pseudonym, string> = pipe(
  Schema.String,
  Schema.filter(isPseudonym, { message: () => 'not a pseudonym' }),
)

export function isPseudonym(value: string): value is Pseudonym {
  const parts = value.split(' ', 2)

  if (typeof parts[0] !== 'string' || typeof parts[1] !== 'string') {
    return false
  }

  return colors.includes(parts[0]) && animals.map(animal => capitalCase(animal)).includes(parts[1])
}

interface PseudonymBrand {
  readonly Pseudonym: unique symbol
}
