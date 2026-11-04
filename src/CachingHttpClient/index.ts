import {
  Headers,
  HttpClient,
  HttpClientError,
  HttpClientResponse,
  UrlParams,
  type HttpClientRequest,
} from 'effect/http'
import { Context, DateTime, Effect, Equal, flow, Function, Layer, Option, pipe, Queue, type Duration } from 'effect'
import * as StatusCodes from '../StatusCodes.ts'
import * as HttpCache from './HttpCache.ts'

export * from './HttpCache.ts'
export { layerInMemory } from './InMemory.ts'
export { layerPersistedToRedis } from './PersistedToRedis.ts'

export const CacheTimeout = '200 millis'

export class RevalidationQueue extends Context.Service<
  RevalidationQueue,
  Queue.Queue<{ request: HttpClientRequest.HttpClientRequest; timeToStale: Duration.Input }>
>()('RevalidationQueue') {}

export const CachingHttpClient: (
  timeToStale: Duration.Input,
  requestTimeout?: Duration.Input,
) => Effect.Effect<HttpClient.HttpClient, never, HttpCache.HttpCache | HttpClient.HttpClient | RevalidationQueue> =
  Effect.fnUntraced(function* (timeToStale, requestTimeout = '2 seconds') {
    const httpClient = yield* HttpClient.HttpClient
    const cache = yield* HttpCache.HttpCache
    const revalidationQueue = yield* RevalidationQueue

    const cachingBehavior: (
      request: Effect.Effect<HttpClientRequest.HttpClientRequest>,
    ) => Effect.Effect<HttpClientResponse.HttpClientResponse, HttpClientError.HttpClientError> = Effect.fn(
      'CachingHttpClient',
    )(function* (request) {
      const timestamp = yield* DateTime.now
      const req = yield* request

      if (req.method !== 'GET' || Equal.equals(Headers.get(req.headers, 'Cache-Control'), Option.some('no-store'))) {
        return yield* httpClient.execute(req)
      }

      const response = yield* pipe(
        cache.get(req),
        Effect.map(Option.getOrUndefined),
        Effect.timeout(CacheTimeout),
        Effect.tapErrorTag('InternalHttpCacheFailure', error =>
          Effect.logError('Failed to read from the HttpCache').pipe(Effect.annotateLogs({ error })),
        ),
        Effect.tapErrorTag('TimeoutError', error =>
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
        if (DateTime.isLessThan(timestamp, response.staleAt)) {
          yield* Effect.logDebug('Cache hit').pipe(Effect.annotateLogs(logAnnotations))
        } else {
          yield* Effect.logDebug('Cache stale').pipe(Effect.annotateLogs(logAnnotations))
          yield* Queue.offer(revalidationQueue, { request: req, timeToStale })
        }
        return response.response
      }

      yield* Effect.logDebug('Cache miss').pipe(Effect.annotateLogs(logAnnotations))

      return yield* pipe(
        req,
        httpClient.execute,
        Effect.timeout(requestTimeout),
        Effect.catchTag(
          'TimeoutError',
          error =>
            new HttpClientError.HttpClientError({
              reason: new HttpClientError.TransportError({ request: req, cause: error }),
            }),
        ),
        Effect.tap(
          HttpClientResponse.matchStatus({
            [StatusCodes.OK]: response =>
              pipe(
                cache.set(response, DateTime.addDuration(timestamp, timeToStale)),
                Effect.tapErrorTag('InternalHttpCacheFailure', error =>
                  Effect.logError('Unable to cache the response').pipe(Effect.annotateLogs({ error })),
                ),
                Effect.ignore,
              ),
            orElse: () => Effect.void,
          }),
        ),
      )
    })

    return HttpClient.makeWith(cachingBehavior, Effect.succeed)
  })

export const layer = (...args: Parameters<typeof CachingHttpClient>) =>
  Layer.effect(HttpClient.HttpClient, CachingHttpClient(...args))

const revalidationWorker = Effect.gen(function* () {
  const cache = yield* HttpCache.HttpCache
  const revalidationQueue = yield* RevalidationQueue
  const httpClient = yield* HttpClient.HttpClient

  return yield* pipe(
    Queue.take(revalidationQueue),
    Effect.tap(({ request }) =>
      Effect.logDebug('Cache revalidating request').pipe(
        Effect.annotateLogs({ url: request.url, urlParams: request.urlParams }),
      ),
    ),
    Effect.bind('response', ({ request }) => httpClient.execute(request)),
    Effect.tap(
      Effect.fnUntraced(function* ({ response, timeToStale }) {
        const timestamp = yield* DateTime.now
        return yield* HttpClientResponse.matchStatus(response, {
          [StatusCodes.OK]: response => cache.set(response, DateTime.addDuration(timestamp, timeToStale)),
          [StatusCodes.NotFound]: response => cache.delete(new URL(response.request.url)),
          [StatusCodes.Gone]: response => cache.delete(new URL(response.request.url)),
          orElse: () => Effect.void,
        })
      }),
    ),
    Effect.tapError(error => Effect.logError('Unable to update cached response').pipe(Effect.annotateLogs({ error }))),
    Effect.ignore,
    Effect.forever,
  )
})

export const layerRevalidationWorker = Layer.effectDiscard(
  Effect.acquireRelease(
    pipe(Effect.logDebug('Revalidation worker started'), Effect.andThen(revalidationWorker)),
    () => Effect.logDebug('Revalidation worker stopped'),
    { interruptible: true },
  ),
)

export const layerRevalidationQueue = Layer.effect(
  RevalidationQueue,
  Effect.acquireRelease(
    pipe(
      Queue.sliding<{ request: HttpClientRequest.HttpClientRequest; timeToStale: Duration.Input }>(100),
      Effect.tap(Effect.logDebug('Revalidation queue started')),
    ),
    flow(Queue.shutdown, Effect.tap(Effect.logDebug('Revalidation queue stopped'))),
  ),
)
