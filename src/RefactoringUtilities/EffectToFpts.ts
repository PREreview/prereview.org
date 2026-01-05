import { Effect, Either, type Equivalence, type Order, pipe, Runtime } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import * as Eq from 'fp-ts/lib/Eq.js'
import type * as IO from 'fp-ts/lib/IO.js'
import * as Ord from 'fp-ts/lib/Ord.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { withEnv } from '../Fpts.ts'

export interface EffectEnv<R> {
  readonly runtime: Runtime.Runtime<R>
}

export const either: <R, L>(either: Either.Either<R, L>) => E.Either<L, R> = Either.match({
  onLeft: E.left,
  onRight: E.right,
})

export const ord = <A>(order: Order.Order<A>): Ord.Ord<A> => Ord.fromCompare(order)

export const eq = <A>(equivalence: Equivalence.Equivalence<A>): Eq.Eq<A> => Eq.fromEquals(equivalence)

export const toReaderTaskEitherK =
  <A extends ReadonlyArray<unknown>, B, E, R>(
    f: (...a: A) => Effect.Effect<B, E, R>,
  ): ((...a: A) => RTE.ReaderTaskEither<EffectEnv<R>, E, B>) =>
  (...a) =>
    toReaderTaskEither(f(...a))

export const toReaderTaskEither = <A, E, R>(effect: Effect.Effect<A, E, R>): RTE.ReaderTaskEither<EffectEnv<R>, E, A> =>
  toReaderTask(Effect.andThen(Effect.either(effect), either))

export const toTaskEitherK =
  <A extends ReadonlyArray<unknown>, B, E, R>(
    f: (...a: A) => Effect.Effect<B, E, R>,
    runtime: Runtime.Runtime<R>,
  ): ((...a: A) => TE.TaskEither<E, B>) =>
  (...a) =>
    toTaskEither(f(...a), runtime)

export const toTaskEither = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtime: Runtime.Runtime<R>,
): TE.TaskEither<E, A> => toTask(Effect.andThen(Effect.either(effect), either), runtime)

export const toReaderTaskK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
  ): ((...a: A) => RT.ReaderTask<EffectEnv<R>, B>) =>
  (...a) =>
    toReaderTask(f(...a))

export const toReaderTask = <A, R>(effect: Effect.Effect<A, never, R>): RT.ReaderTask<EffectEnv<R>, A> =>
  pipe(
    RT.ask<EffectEnv<R>>(),
    RT.chainTaskK(({ runtime }) => toTask(effect, runtime)),
  )

export const toTaskK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
    runtime: Runtime.Runtime<R>,
  ): ((...a: A) => T.Task<B>) =>
  (...a) =>
    toTask(f(...a), runtime)

export const toTask =
  <A, R>(effect: Effect.Effect<A, never, R>, runtime: Runtime.Runtime<R>): T.Task<A> =>
  () =>
    Runtime.runPromise(runtime)(effect)

export const toReaderIO = <A, R>(effect: Effect.Effect<A, never, R>): RIO.ReaderIO<EffectEnv<R>, A> =>
  pipe(
    RIO.ask<EffectEnv<R>>(),
    RIO.chainIOK(({ runtime }) => toIO(effect, runtime)),
  )

export const toIOK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
    runtime: Runtime.Runtime<R>,
  ): ((...a: A) => IO.IO<B>) =>
  (...a) =>
    toIO(f(...a), runtime)

export const toIO =
  <A, R>(effect: Effect.Effect<A, never, R>, runtime: Runtime.Runtime<R>): IO.IO<A> =>
  () =>
    Runtime.runSync(runtime)(effect)

export const makeTaskEitherK = <A extends ReadonlyArray<unknown>, B, E, R>(
  f: (...a: A) => Effect.Effect<B, E, R>,
): Effect.Effect<(...a: A) => TE.TaskEither<E, B>, never, R> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<R>()

    return withEnv(toReaderTaskEitherK(f), { runtime })
  })

export const makeTaskK = <A extends ReadonlyArray<unknown>, B, R>(
  f: (...a: A) => Effect.Effect<B, never, R>,
): Effect.Effect<(...a: A) => T.Task<B>, never, R> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<R>()

    return withEnv(toReaderTaskK(f), { runtime })
  })

export const makeIO = <A, R>(effect: Effect.Effect<A, never, R>): Effect.Effect<IO.IO<A>, never, R> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<R>()

    return toReaderIO(effect)({ runtime })
  })
