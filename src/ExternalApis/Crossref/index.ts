import { Context, Effect, flow, Layer, Scope, Semaphore } from 'effect'
import { HttpClient } from 'effect/http'
import { RateLimiter } from 'effect/persistence'
import { GetWork } from './GetWork/index.ts'

export { Work, WorkResponseSchema } from './Work.ts'

export class Crossref extends Context.Service<
  Crossref,
  {
    getWork: (
      ...args: Parameters<typeof GetWork>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof GetWork>>, Effect.Error<ReturnType<typeof GetWork>>>
  }
>()('Crossref') {}

export const getWork = (...args: Parameters<(typeof Crossref.Service)['getWork']>) =>
  Crossref.use(service => service.getWork(...args))

const make: Effect.Effect<typeof Crossref.Service, never, HttpClient.HttpClient> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient>(), Context.omit(Scope.Scope))

  return {
    getWork: flow(GetWork, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Crossref, make)

export const layerRateLimitedHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const limiter = yield* RateLimiter.RateLimiter
    const concurrencyLimit = yield* Semaphore.make(2)

    return httpClient.pipe(
      HttpClient.timeout('2 seconds'),
      HttpClient.transform(concurrencyLimit.withPermits(1)),
      HttpClient.withRateLimiter({
        limiter,
        key: 'crossref',
        algorithm: 'token-bucket',
        limit: 8,
        window: '1 second',
        times: 3,
      }),
      HttpClient.catchTag('RateLimiterError', Effect.die),
    )
  }),
)
