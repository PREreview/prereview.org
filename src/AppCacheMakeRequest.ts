import {
  HttpClient,
  UrlParams,
  type HttpClientError,
  type HttpClientRequest,
  type HttpClientResponse,
} from '@effect/platform'
import { Context, DateTime, Effect, pipe, type Scope } from 'effect'

export interface CacheValue {
  staleAt: DateTime.DateTime
  response: HttpClientResponse.HttpClientResponse
}

type CacheKey = URL

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (key: CacheKey) => CacheValue | undefined
    set: (key: CacheKey, value: CacheValue) => void
    delete: (key: CacheKey) => void
  }
>() {}

export const CachingHttpClient: Effect.Effect<HttpClient.HttpClient, never, HttpCache | HttpClient.HttpClient> =
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const cache = yield* HttpCache

    const cachingBehaviour = (
      request: Effect.Effect<HttpClientRequest.HttpClientRequest>,
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError, Scope.Scope> =>
      Effect.gen(function* () {
        const timestamp = yield* DateTime.now
        const req = yield* request
        const key = keyForRequest(req)
        const response = cache.get(key)

        if (response) {
          if (DateTime.lessThan(timestamp, response.staleAt)) {
            yield* Effect.logDebug('Cache hit')
          } else {
            yield* Effect.logDebug('Cache stale')
            yield* Effect.forkDaemon(
              Effect.gen(function* () {
                yield* pipe(
                  req,
                  httpClient.execute,
                  Effect.tap(response =>
                    cache.set(key, { staleAt: DateTime.addDuration(timestamp, '10 seconds'), response }),
                  ),
                  Effect.scoped,
                )
              }),
            )
          }
          return response.response
        } else {
          yield* Effect.logDebug('Cache miss')
        }

        return yield* pipe(
          req,
          httpClient.execute,
          Effect.tap(response => cache.set(key, { staleAt: DateTime.addDuration(timestamp, '10 seconds'), response })),
          Effect.tap(response =>
            Effect.gen(function* () {
              const cachedValue = cache.get(key)
              if (cachedValue === undefined) {
                return yield* Effect.logError('cache entry not found')
              }
              if (response !== cachedValue.response) {
                return yield* Effect.logError('cached response does not equal original')
              }
            }),
          ),
        )
      })

    return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
  })

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return url
}
