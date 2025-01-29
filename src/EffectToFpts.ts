import { Effect, Either, pipe, Runtime } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type * as IO from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import { withEnv } from './Fpts.js'

export interface EffectEnv<R> {
  readonly runtime: Runtime.Runtime<R>
}

export const either: <R, L>(either: Either.Either<R, L>) => E.Either<L, R> = Either.match({
  onLeft: E.left,
  onRight: E.right,
})

export const toReaderMiddleware = <A, I, E, R>(
  effect: Effect.Effect<A, E, R>,
): RM.ReaderMiddleware<EffectEnv<R>, I, I, E, A> => RM.fromReaderTaskEither(toReaderTaskEither(effect))

export const toReaderTaskEitherK =
  <A extends ReadonlyArray<unknown>, B, E, R>(
    f: (...a: A) => Effect.Effect<B, E, R>,
  ): ((...a: A) => RTE.ReaderTaskEither<EffectEnv<R>, E, B>) =>
  (...a) =>
    toReaderTaskEither(f(...a))

export const toReaderTaskEither = <A, E, R>(effect: Effect.Effect<A, E, R>): RTE.ReaderTaskEither<EffectEnv<R>, E, A> =>
  toReaderTask(Effect.either(effect))

export const toReaderTaskK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
  ): ((...a: A) => RT.ReaderTask<EffectEnv<R>, B>) =>
  (...a) =>
    toReaderTask(f(...a))

export const toReaderTask = <A, R>(effect: Effect.Effect<A, never, R>): RT.ReaderTask<EffectEnv<R>, A> =>
  pipe(
    RT.ask<EffectEnv<R>>(),
    RT.chainTaskK(
      ({ runtime }) =>
        () =>
          Runtime.runPromise(runtime)(effect),
    ),
  )

export const toReaderIO = <A, R>(effect: Effect.Effect<A, never, R>): RIO.ReaderIO<EffectEnv<R>, A> =>
  pipe(
    RIO.ask<EffectEnv<R>>(),
    RIO.map(({ runtime }) => Runtime.runSync(runtime)(effect)),
  )

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
