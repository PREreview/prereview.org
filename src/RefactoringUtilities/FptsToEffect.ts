import { type Array, Effect, Either, type Equivalence, flow, identity, Option } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type { Eq } from 'fp-ts/lib/Eq.js'
import type * as IO from 'fp-ts/lib/IO.js'
import * as O from 'fp-ts/lib/Option.js'
import type { Reader } from 'fp-ts/lib/Reader.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as RNEA from 'fp-ts/lib/ReadonlyNonEmptyArray.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'

export const array: <A>(array: RNEA.ReadonlyNonEmptyArray<A>) => Array.NonEmptyReadonlyArray<A> = identity as never

export const either: <E, A>(value: E.Either<E, A>) => Either.Either<A, E> = E.matchW(Either.left, Either.right)

export const eitherK: <E, A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => E.Either<E, B>,
) => (...a: A) => Either.Either<B, E> = f => flow(f, either)

export const option: <A>(value: O.Option<A>) => Option.Option<A> = O.match(Option.none, Option.some)

export const optionK: <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => O.Option<B>,
) => (...a: A) => Option.Option<B> = f => flow(f, option)

export const eq = <A>(value: Eq<A>): Equivalence.Equivalence<A> => value.equals

export const io: <A>(value: IO.IO<A>) => Effect.Effect<A> = Effect.sync

export const task: <A>(value: T.Task<A>) => Effect.Effect<A> = Effect.promise

export const taskK: <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => T.Task<B>,
) => (...a: A) => Effect.Effect<B> = f => flow(f, task)

export const taskEither: <E, A>(value: TE.TaskEither<E, A>) => Effect.Effect<A, E> = flow(task, Effect.andThen(either))

export const reader: <R, A>(value: Reader<R, A>, env: R) => Effect.Effect<A> = (value, env) =>
  Effect.sync(() => value(env))

export const readerTask: <R, A>(value: RT.ReaderTask<R, A>, env: R) => Effect.Effect<A> = flow(
  reader,
  Effect.andThen(task),
)

export const readerTaskEither: <R, E, A>(value: RTE.ReaderTaskEither<R, E, A>, env: R) => Effect.Effect<A, E> = flow(
  reader,
  Effect.andThen(taskEither),
)
