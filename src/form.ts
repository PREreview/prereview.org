import * as E from 'fp-ts/Either'
import * as O from 'fp-ts/Option'
import * as RR from 'fp-ts/ReadonlyRecord'
import { pipe } from 'fp-ts/function'
import { isString } from 'fp-ts/string'
import * as DE from 'io-ts/DecodeError'
import * as D from 'io-ts/Decoder'
import * as FS from 'io-ts/FreeSemigroup'

export interface InvalidE {
  readonly _tag: 'InvalidE'
  readonly actual: string
}

export interface MissingE {
  readonly _tag: 'MissingE'
}

export const missingE = (): MissingE => ({
  _tag: 'MissingE',
})

export const invalidE = (actual: string): InvalidE => ({
  _tag: 'InvalidE',
  actual,
})

export const hasAnError: (form: RR.ReadonlyRecord<string, E.Either<unknown, unknown>>) => boolean = RR.some(E.isLeft)

export function getInput(field: string): (error: D.DecodeError) => O.Option<string> {
  return FS.fold(
    DE.fold({
      Leaf: O.fromPredicate(isString),
      Key: (key, kind, errors) => (key === field ? getInput(field)(errors) : O.none),
      Index: (index, kind, errors) => getInput(field)(errors),
      Member: (index, errors) => getInput(field)(errors),
      Lazy: (id, errors) => getInput(field)(errors),
      Wrap: (error, errors) => getInput(field)(errors),
    }),
    (left, right) =>
      pipe(
        getInput(field)(left),
        O.alt(() => getInput(field)(right)),
      ),
  )
}
