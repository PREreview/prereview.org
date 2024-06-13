import { sequenceS } from 'fp-ts/lib/Apply.js'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as RR from 'fp-ts/lib/ReadonlyRecord.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import { isString } from 'fp-ts/lib/string.js'
import * as DE from 'io-ts/lib/DecodeError.js'
import type * as D from 'io-ts/lib/Decoder.js'
import * as FS from 'io-ts/lib/FreeSemigroup.js'

export type FieldDecoders = EnforceNonEmptyRecord<Record<string, (input: unknown) => E.Either<unknown, unknown>>>

export type Fields<T extends FieldDecoders> = {
  [K in keyof T]: ReturnType<T[K]> | E.Right<undefined>
}

export type ValidFields<T extends FieldDecoders> = {
  [K in keyof T]: ReturnType<T[K]> extends E.Either<unknown, infer A> ? A : never
}

export interface InvalidE {
  readonly _tag: 'InvalidE'
  readonly actual: string
}

export interface MissingE {
  readonly _tag: 'MissingE'
}

export interface TooBigE {
  readonly _tag: 'TooBigE'
}

export interface WrongTypeE {
  readonly _tag: 'WrongTypeE'
}

export const decodeFields = <T extends FieldDecoders>(fields: T) =>
  flow(
    (body: unknown) =>
      Object.fromEntries(
        Object.entries(fields).map(([key, decoder]) => {
          return [
            key,
            decoder(typeof body === 'object' && body !== null ? (body as Record<string, unknown>)[key] : undefined),
          ]
        }),
      ) as EnforceNonEmptyRecord<{ [K in keyof T]: ReturnType<T[K]> }>,
    fields =>
      pipe(
        sequenceS(E.Apply)(fields),
        E.mapLeft(() => fields),
      ),
  )

export const requiredDecoder = <I, A>(decoder: D.Decoder<I, A>): ((value: I) => E.Either<MissingE, A>) =>
  flow(decoder.decode, E.mapLeft(missingE))

export const optionalDecoder = <I, A>(decoder: D.Decoder<I, A>): ((value: I) => E.Either<never, A | undefined>) =>
  flow(
    decoder.decode,
    E.orElseW(() => E.right(undefined)),
  )

export const missingE = (): MissingE => ({
  _tag: 'MissingE',
})

export const invalidE = (actual: string): InvalidE => ({
  _tag: 'InvalidE',
  actual,
})

export const tooBigE = (): TooBigE => ({
  _tag: 'TooBigE',
})

export const wrongTypeE = (): WrongTypeE => ({
  _tag: 'WrongTypeE',
})

export const hasAnError: <K extends string>(form: RR.ReadonlyRecord<K, E.Either<unknown, unknown>>) => boolean =
  RR.some(E.isLeft)

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

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R
