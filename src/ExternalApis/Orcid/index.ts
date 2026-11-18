import { HttpClient } from 'effect/http'
import { RateLimiter } from 'effect/persistence'
import { Array, Context, Effect, flow, Layer, Scope } from 'effect'
import { GetPersonalDetails } from './GetPersonalDetails/index.ts'
import { OrcidApi } from './OrcidApi.ts'

export * from './OrcidApi.ts'

export class Orcid extends Context.Service<
  Orcid,
  {
    getPersonalDetails: (
      ...args: Parameters<typeof GetPersonalDetails>
    ) => Effect.Effect<
      Effect.Success<ReturnType<typeof GetPersonalDetails>>,
      Effect.Error<ReturnType<typeof GetPersonalDetails>>
    >
  }
>()('Orcid') {}

export const getPersonalDetails = (...args: Parameters<(typeof Orcid.Service)['getPersonalDetails']>) =>
  Orcid.use(service => service.getPersonalDetails(...args))

const make: Effect.Effect<typeof Orcid.Service, never, HttpClient.HttpClient | OrcidApi> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<HttpClient.HttpClient | OrcidApi>(), Context.omit(Scope.Scope))

  return {
    getPersonalDetails: flow(GetPersonalDetails, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Orcid, make)

const memberApiHosts = ['api.orcid.org', 'api.sandbox.orcid.org']

const requestsPerSecond = (api: typeof OrcidApi.Service) =>
  Array.contains(memberApiHosts, api.origin.hostname) ? 24 : 12

export const layerRateLimitedHttpClient = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const limiter = yield* RateLimiter.RateLimiter
    const api = yield* OrcidApi

    return httpClient.pipe(
      HttpClient.timeout('2 seconds'),
      HttpClient.withRateLimiter({
        limiter,
        key: 'orcid',
        algorithm: 'token-bucket',
        limit: requestsPerSecond(api),
        window: '1 second',
        times: 3,
      }),
      HttpClient.catchTag('RateLimiterError', Effect.die),
    )
  }),
)
