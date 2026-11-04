import { type Context, Effect, Result } from 'effect'
import * as E from 'fp-ts/lib/Either.js'
import type * as IO from 'fp-ts/lib/IO.js'
import type * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'

export interface EffectEnv<R = never> {
  readonly runtime: Context.Context<R>
}

export type ContextServices<C> = C extends Context.Context<infer R> ? R : never

export const either: <R, L>(either: Result.Result<R, L>) => E.Either<L, R> = Result.match({
  onFailure: E.left,
  onSuccess: E.right,
})

export const toReaderTaskEitherK =
  <A extends ReadonlyArray<unknown>, B, E, R>(
    f: (...a: A) => Effect.Effect<B, E, R>,
  ): ((...a: A) => RTE.ReaderTaskEither<EffectEnv<R>, E, B>) =>
  (...a) =>
    toReaderTaskEither(f(...a))

export const toReaderTaskEither =
  <A, E, R>(effect: Effect.Effect<A, E, R>): RTE.ReaderTaskEither<EffectEnv<R>, E, A> =>
  ({ runtime }) =>
    toTaskEither(effect, runtime)

export const toTaskEitherK =
  <A extends ReadonlyArray<unknown>, B, E, R>(
    f: (...a: A) => Effect.Effect<B, E, R>,
    runtime: Context.Context<R>,
  ): ((...a: A) => TE.TaskEither<E, B>) =>
  (...a) =>
    toTaskEither(f(...a), runtime)

export const toTaskEither = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  runtime: Context.Context<R>,
): TE.TaskEither<E, A> => toTask(Effect.map(Effect.result(effect), either), runtime)

export const toReaderTaskK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
  ): ((...a: A) => RT.ReaderTask<EffectEnv<R>, B>) =>
  (...a) =>
    toReaderTask(f(...a))

export const toReaderTask =
  <A, R>(effect: Effect.Effect<A, never, R>): RT.ReaderTask<EffectEnv<R>, A> =>
  ({ runtime }) =>
    toTask(effect, runtime)

export const toTaskK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
    runtime: Context.Context<R>,
  ): ((...a: A) => T.Task<B>) =>
  (...a) =>
    toTask(f(...a), runtime)

export const toTask =
  <A, R>(effect: Effect.Effect<A, never, R>, runtime: Context.Context<R>): T.Task<A> =>
  () =>
    Effect.runPromiseWith(runtime)(effect)

export const toIOK =
  <A extends ReadonlyArray<unknown>, B, R>(
    f: (...a: A) => Effect.Effect<B, never, R>,
    runtime: Context.Context<R>,
  ): ((...a: A) => IO.IO<B>) =>
  (...a) =>
    toIO(f(...a), runtime)

export const toIO =
  <A, R>(effect: Effect.Effect<A, never, R>, runtime: Context.Context<R>): IO.IO<A> =>
  () =>
    Effect.runSyncWith(runtime)(effect)

export const makeTaskK = <A extends ReadonlyArray<unknown>, B, R>(
  f: (...a: A) => Effect.Effect<B, never, R>,
): Effect.Effect<(...a: A) => T.Task<B>, never, R> => Effect.map(Effect.context<R>(), runtime => toTaskK(f, runtime))

export const makeIO = <A, R>(effect: Effect.Effect<A, never, R>): Effect.Effect<IO.IO<A>, never, R> =>
  Effect.map(Effect.context<R>(), runtime => toIO(effect, runtime))
