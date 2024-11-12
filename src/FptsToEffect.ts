import { type Array, Effect, Either, flow, identity, Option, pipe } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'

export const array: <A>(array: RNEA.ReadonlyNonEmptyArray<A>) => Array.NonEmptyReadonlyArray<A> = identity as never

export const either: <E, A>(value: E.Either<E, A>) => Either.Either<A, E> = E.matchW(Either.left, Either.right)

export const option: <A>(value: O.Option<A>) => Option.Option<A> = O.match(Option.none, Option.some)

export const taskEither: <E, A>(value: TE.TaskEither<E, A>) => Effect.Effect<A, E> = flow(
  Effect.promise,
  Effect.andThen(either),
)

export const readerTaskEither: <R, E, A>(value: RTE.ReaderTaskEither<R, E, A>, env: R) => Effect.Effect<A, E> = (
  value,
  env,
) => pipe(value(env), taskEither)
