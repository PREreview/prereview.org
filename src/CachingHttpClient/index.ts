import {
  HttpClient,
  HttpClientError,
  UrlParams,
  type HttpClientRequest,
  type HttpClientResponse,
} from '@effect/platform'
import { DateTime, Effect, Layer, Option, pipe, type Scope } from 'effect'
import { loggingHttpClient } from '../LoggingHttpClient.js'
import * as HttpCache from './HttpCache.js'

export * from './HttpCache.js'

export const CachingHttpClient: Effect.Effect<
  HttpClient.HttpClient,
  never,
  HttpCache.HttpCache | HttpClient.HttpClient
> = Effect.gen(function* () {
  const httpClient = yield* Effect.andThen(HttpClient.HttpClient, loggingHttpClient)
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
        Effect.timeoutFail({
          duration: '2 seconds',
          onTimeout: () => new HttpClientError.RequestError({ request: req, reason: 'Transport', cause: 'Timeout' }),
        }),
        Effect.tap(response => pipe(cache.set(response, DateTime.addDuration(timestamp, '10 seconds')), Effect.ignore)),
      )
    })

  return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
})

export const layer = Layer.effect(HttpClient.HttpClient, CachingHttpClient)
