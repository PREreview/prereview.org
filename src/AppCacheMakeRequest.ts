import {
  HttpClient,
  UrlParams,
  type HttpClientError,
  type HttpClientRequest,
  type HttpClientResponse,
} from '@effect/platform'
import crypto from 'crypto'
import { Context, DateTime, Effect, pipe, type Scope } from 'effect'

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  Map<string, { staleAt: DateTime.DateTime; response: HttpClientResponse.HttpClientResponse }>
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
        )
      })

    return HttpClient.makeWith(cachingBehaviour, Effect.succeed)
  })

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): string => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return crypto.createHash('md5').update(url.href).digest('hex')
}
