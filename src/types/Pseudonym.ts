import { animals, colors } from 'anonymus'
import { capitalCase } from 'case-anything'
import { type Brand, Either, pipe, Schema } from 'effect'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as EffectToFpts from '../EffectToFpts.ts'
import { type NonEmptyString, NonEmptyStringSchema } from './NonEmptyString.ts'

const PseudonymBrand: unique symbol = Symbol.for('Pseudonym')

export type Pseudonym = NonEmptyString & Brand.Brand<typeof PseudonymBrand>

export const PseudonymC = C.fromDecoder(
  pipe(
    D.string,
    D.parse(s =>
      EffectToFpts.either(
        Either.try({
          try: () => PseudonymSchema.make(s),
          catch: () => D.error(s, 'Pseudonym'),
        }),
      ),
    ),
  ),
)

export const PseudonymSchema = pipe(
  NonEmptyStringSchema,
  Schema.filter(isPseudonym, { message: () => 'not a pseudonym' }),
  Schema.brand(PseudonymBrand),
)

export function isPseudonym(value: string): value is Pseudonym {
  const parts = value.split(' ', 2)

  if (typeof parts[0] !== 'string' || typeof parts[1] !== 'string') {
    return false
  }

  return colors.includes(parts[0]) && animals.map(animal => capitalCase(animal)).includes(parts[1])
}

export const Pseudonym = (pseudonym: string) => PseudonymSchema.make(pseudonym)
