import { HttpClient, HttpClientError, HttpClientResponse, UrlParams, type HttpClientRequest } from '@effect/platform'
import { DateTime, Effect, Function, Layer, Option, pipe, type Duration, type Scope } from 'effect'
import { Status } from 'hyper-ts'
import { loggingHttpClient } from '../LoggingHttpClient.js'
import * as HttpCache from './HttpCache.js'

export * from './HttpCache.js'
export { layerInMemory } from './InMemory.js'
export { layerPersistedToRedis } from './PersistedToRedis.js'

export const CachingHttpClient = (
  timeToStale: Duration.DurationInput,
): Effect.Effect<HttpClient.HttpClient, never, HttpCache.HttpCache | HttpClient.HttpClient> =>
  Effect.gen(function* () {
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
                Effect.tap(
                  HttpClientResponse.matchStatus({
                    [Status.OK]: response => cache.set(response, DateTime.addDuration(timestamp, timeToStale)),
                    orElse: Function.constVoid,
                  }),
                ),
                Effect.scoped,
                Effect.tapError(error =>
                  Effect.logError('Unable to update cached response').pipe(Effect.annotateLogs({ error })),
                ),
                Effect.ignore,
              ),
            )
          }
          return response.response
        }

        yield* Effect.logDebug('Cache miss').pipe(Effect.annotateLogs(logAnnotations))

        return yield* pipe(
          req,
          httpClient.execute,
          Effect.timeoutFail({
            duration: '2 seconds',
            onTimeout: () => new HttpClientError.RequestError({ request: req, reason: 'Transport', cause: 'Timeout' }),
          }),
          Effect.tap(
            HttpClientResponse.matchStatus({
              [Status.OK]: response =>
                pipe(cache.set(response, DateTime.addDuration(timestamp, timeToStale)), Effect.ignore),
              orElse: Function.constVoid,
            }),
          ),
        )
      })

    return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
  })

export const layer = (timeToStale: Duration.DurationInput) =>
  Layer.effect(HttpClient.HttpClient, CachingHttpClient(timeToStale))
