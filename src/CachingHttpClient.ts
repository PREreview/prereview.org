import {
  HttpClient,
  UrlParams,
  type HttpClientError,
  type HttpClientRequest,
  type HttpClientResponse,
} from '@effect/platform'
import { diff } from 'deep-object-diff'
import { DateTime, Effect, Option, pipe, type Scope } from 'effect'
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
      const response = yield* pipe(Effect.option(cache.get(req)), Effect.andThen(Option.getOrUndefined))

      const logAnnotations = {
        url: req.url,
        urlParams: UrlParams.toString(req.urlParams),
        method: req.method,
      }

      if (response) {
        if (DateTime.lessThan(timestamp, response.staleAt)) {
          yield* Effect.logDebug('Cache hit').pipe(Effect.annotateLogs(logAnnotations))
        } else {
          yield* Effect.logDebug('Cache stale').pipe(Effect.annotateLogs(logAnnotations))
          yield* Effect.forkDaemon(
            pipe(
              req,
              httpClient.execute,
              Effect.tap(response => cache.set(response, DateTime.addDuration(timestamp, '10 seconds'))),
              Effect.scoped,
              Effect.tapError(error =>
                Effect.logError('Unable to update cached response').pipe(Effect.annotateLogs({ error })),
              ),
              Effect.ignore,
            ),
          )
        }
        return response.response
      } else {
        yield* Effect.logDebug('Cache miss').pipe(Effect.annotateLogs(logAnnotations))
      }

      return yield* pipe(
        req,
        httpClient.execute,
        Effect.tap(response => pipe(cache.set(response, DateTime.addDuration(timestamp, '10 seconds')), Effect.ignore)),
        Effect.tap(response =>
          Effect.gen(function* () {
            const cachedValue = yield* pipe(Effect.option(cache.get(req)), Effect.andThen(Option.getOrUndefined))
            if (cachedValue === undefined) {
              return yield* Effect.logError('cache entry not found').pipe(Effect.annotateLogs(logAnnotations))
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
                Effect.annotateLogs({ ...logAnnotations, diff: JSON.parse(JSON.stringify(difference, replacer)) }),
              )
            }
          }),
        ),
      )
    })

  return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
})
