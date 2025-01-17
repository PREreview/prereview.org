import { HttpClient, type HttpClientError, type HttpClientRequest, type HttpClientResponse } from '@effect/platform'
import { diff } from 'deep-object-diff'
import { DateTime, Effect, pipe, type Scope } from 'effect'
import * as HttpCache from './HttpCache.js'

export const CachingHttpClient: Effect.Effect<
  HttpClient.HttpClient,
  never,
  HttpCache.HttpCache | HttpClient.HttpClient
> = Effect.gen(function* () {
  const httpClient = yield* HttpClient.HttpClient
  const cache = yield* HttpCache.HttpCache

  const cachingBehaviour = (
    request: Effect.Effect<HttpClientRequest.HttpClientRequest>,
  ): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError, Scope.Scope> =>
    Effect.gen(function* () {
      const timestamp = yield* DateTime.now
      const req = yield* request
      const response = yield* cache.get(req)

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
                Effect.tap(response => cache.set(response, DateTime.addDuration(timestamp, '10 seconds'))),
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
        Effect.tap(response => pipe(cache.set(response, DateTime.addDuration(timestamp, '10 seconds')), Effect.ignore)),
        Effect.tap(response =>
          Effect.gen(function* () {
            const cachedValue = yield* cache.get(req)
            if (cachedValue === undefined) {
              return yield* Effect.logError('cache entry not found')
            }
            const origResponse = {
              status: response.status,
              headers: { ...response.headers },
              body: yield* response.text,
            }
            const cachedResponse = {
              status: cachedValue.response.status,
              headers: cachedValue.response.headers,
              body: yield* cachedValue.response.text,
            }
            const difference = diff(origResponse, cachedResponse)
            function replacer(_: unknown, value: unknown) {
              if (value == undefined) {
                return null
              }
              return value
            }
            if (Object.keys(difference).length !== 0) {
              return yield* Effect.logError('cached response does not equal original').pipe(
                Effect.annotateLogs({ diff: JSON.parse(JSON.stringify(difference, replacer)) }),
              )
            }
          }),
        ),
      )
    })

  return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
})
