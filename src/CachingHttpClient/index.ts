import { HttpClient, HttpClientError, HttpClientResponse, UrlParams, type HttpClientRequest } from '@effect/platform'
import { DateTime, Effect, Function, Layer, pipe, Queue, type Duration } from 'effect'
import { Status } from 'hyper-ts'
import * as HttpCache from './HttpCache.js'

export * from './HttpCache.js'
export { layerInMemory } from './InMemory.js'
export { layerPersistedToRedis } from './PersistedToRedis.js'

export const CacheTimeout = '200 millis'

export const CachingHttpClient = (
  timeToStale: Duration.DurationInput,
  requestTimeout: Duration.DurationInput = '2 seconds',
): Effect.Effect<HttpClient.HttpClient, never, HttpCache.HttpCache | HttpClient.HttpClient> =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const cache = yield* HttpCache.HttpCache
    const revalidationQueue = yield* Queue.sliding<HttpClientRequest.HttpClientRequest>(100)

    yield* pipe(
      Effect.logDebug('Starting revalidationWorker'),
      Effect.andThen(revalidationWorker({ cache, httpClient, revalidationQueue, timeToStale })),
      Effect.forkDaemon,
    )

    const cachingBehaviour = (
      request: Effect.Effect<HttpClientRequest.HttpClientRequest>,
    ): Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> =>
      Effect.gen(function* () {
        const timestamp = yield* DateTime.now
        const req = yield* request

        if (req.method !== 'GET') {
          return yield* httpClient.execute(req)
        }

        const response = yield* pipe(
          cache.get(req),
          Effect.catchTag('NoCachedResponseFound', () => Effect.succeed(undefined)),
          Effect.timeout(CacheTimeout),
          Effect.tapErrorTag('InternalHttpCacheFailure', error =>
            Effect.logError('Failed to read from the HttpCache').pipe(Effect.annotateLogs({ error })),
          ),
          Effect.tapErrorTag('TimeoutException', error =>
            Effect.logWarning('Reading from HttpCache timed out').pipe(Effect.annotateLogs({ error })),
          ),
          Effect.orElseSucceed(Function.constUndefined),
        )

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
            yield* Queue.offer(revalidationQueue, req)
          }
          return response.response
        }

        yield* Effect.logDebug('Cache miss').pipe(Effect.annotateLogs(logAnnotations))

        return yield* pipe(
          req,
          httpClient.execute,
          Effect.timeout(requestTimeout),
          Effect.catchTag(
            'TimeoutException',
            error => new HttpClientError.RequestError({ request: req, reason: 'Transport', cause: error }),
          ),
          Effect.tap(
            HttpClientResponse.matchStatus({
              [Status.OK]: response =>
                pipe(
                  cache.set(response, DateTime.addDuration(timestamp, timeToStale)),
                  Effect.tapErrorTag('InternalHttpCacheFailure', error =>
                    Effect.logError('Unable to cache the response').pipe(Effect.annotateLogs({ error })),
                  ),
                  Effect.ignore,
                ),
              orElse: Function.constVoid,
            }),
          ),
        )
      })

    return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
  })

export const layer = (...args: Parameters<typeof CachingHttpClient>) =>
  Layer.effect(HttpClient.HttpClient, CachingHttpClient(...args))

const revalidationWorker = ({
  cache,
  httpClient,
  revalidationQueue,
  timeToStale,
}: {
  cache: typeof HttpCache.HttpCache.Service
  httpClient: HttpClient.HttpClient
  revalidationQueue: Queue.Dequeue<HttpClientRequest.HttpClientRequest>
  timeToStale: Duration.DurationInput
}) =>
  pipe(
    Queue.take(revalidationQueue),
    Effect.tap(request =>
      Effect.logDebug('Cache revalidating request').pipe(
        Effect.annotateLogs({ url: request.url, urlParams: request.urlParams }),
      ),
    ),
    Effect.andThen(httpClient.execute),
    Effect.tap(response =>
      Effect.gen(function* () {
        const timestamp = yield* DateTime.now
        return yield* HttpClientResponse.matchStatus(response, {
          [Status.OK]: response => cache.set(response, DateTime.addDuration(timestamp, timeToStale)),
          [Status.NotFound]: response => cache.delete(new URL(response.request.url)),
          [Status.Gone]: response => cache.delete(new URL(response.request.url)),
          orElse: () => Effect.void,
        })
      }),
    ),
    Effect.tapError(error => Effect.logError('Unable to update cached response').pipe(Effect.annotateLogs({ error }))),
    Effect.ignore,
    Effect.forever,
  )
