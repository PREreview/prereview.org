import { Effect, pipe, Runtime } from 'effect'
import type * as IO from 'fp-ts/lib/IO.js'
import * as RIO from 'fp-ts/lib/ReaderIO.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'

export interface EffectEnv<R> {
  readonly runtime: Runtime.Runtime<R>
}

export const toReaderMiddleware = <A, I, E, R>(
  effect: Effect.Effect<A, E, R>,
): RM.ReaderMiddleware<EffectEnv<R>, I, I, E, A> => RM.fromReaderTaskEither(toReaderTaskEither(effect))

export const toReaderTaskEither = <A, E, R>(effect: Effect.Effect<A, E, R>): RTE.ReaderTaskEither<EffectEnv<R>, E, A> =>
  pipe(
    RTE.ask<EffectEnv<R>>(),
    RTE.chainTaskEitherK(
      ({ runtime }) =>
        () =>
          pipe(Effect.either(effect), Runtime.runPromise(runtime)),
    ),
  )

export const toReaderTask = <A, R>(effect: Effect.Effect<A>): RT.ReaderTask<EffectEnv<R>, A> =>
  pipe(
    RT.ask<EffectEnv<R>>(),
    RT.chainTaskK(
      ({ runtime }) =>
        () =>
          Runtime.runPromise(runtime)(effect),
    ),
  )

export const toReaderIO = <A, R>(effect: Effect.Effect<A>): RIO.ReaderIO<EffectEnv<R>, A> =>
  pipe(
    RIO.ask<EffectEnv<R>>(),
    RIO.map(({ runtime }) => Runtime.runSync(runtime)(effect)),
  )

export const makeTaskEitherK = <A extends ReadonlyArray<unknown>, B, E>(
  f: (...a: A) => Effect.Effect<B, E>,
): Effect.Effect<(...a: A) => TE.TaskEither<E, B>> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime()

    return (...a) => toReaderTaskEither<B, E, never>(f(...a))({ runtime })
  })

export const makeTaskK = <A extends ReadonlyArray<unknown>, B>(
  f: (...a: A) => Effect.Effect<B>,
): Effect.Effect<(...a: A) => T.Task<B>> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime()

    return (...a) => toReaderTask<B, never>(f(...a))({ runtime })
  })

export const makeIO = <A>(effect: Effect.Effect<A>): Effect.Effect<IO.IO<A>> =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime()

    return toReaderIO<A, never>(effect)({ runtime })
  })
