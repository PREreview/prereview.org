import type { HttpClient } from '@effect/platform'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import { GetWork } from './GetWork/index.ts'

export { Work, WorkResponseSchema } from './Work.ts'

export class Crossref extends Context.Tag('Crossref')<
  Crossref,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof GetWork>>,
      Effect.Effect.Error<ReturnType<typeof GetWork>>
    >
  }
>() {}

export const getWork = (...args: Parameters<(typeof Crossref.Service)['getWork']>) =>
  Effect.flatMap(Crossref, service => service.getWork(...args))

const make: Effect.Effect<typeof Crossref.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  const concurrencyLimit = yield* Effect.makeSemaphore(3)

  return {
    getWork: flow(GetWork, concurrencyLimit.withPermits(1), Effect.provide(context)),
  }
})

export const layer = Layer.effect(Crossref, make)
