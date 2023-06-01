import { animals, colors } from 'anonymus'
import { capitalCase } from 'capital-case'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { NonEmptyString } from './string'

export type Pseudonym = NonEmptyString & PseudonymBrand

export const PseudonymC = C.fromDecoder(pipe(D.string, D.refine(isPseudonym, 'Pseudonym')))

export function isPseudonym(value: string): value is Pseudonym {
  const parts = value.split(' ', 2)

  return colors.includes(parts[0]) && animals.map(animal => capitalCase(animal)).includes(parts[1])
}

interface PseudonymBrand {
  readonly Pseudonym: unique symbol
}
