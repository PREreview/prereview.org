import { HttpClient, type HttpClientError, type HttpClientRequest, type HttpClientResponse } from '@effect/platform'
import crypto from 'crypto'
import { DateTime, Effect, pipe, type Scope } from 'effect'

export const CachingHttpClient: Effect.Effect<HttpClient.HttpClient, never, HttpClient.HttpClient> = Effect.gen(
  function* () {
    const httpClient = yield* HttpClient.HttpClient
    const cache = new Map<string, { staleAt: DateTime.DateTime; response: HttpClientResponse.HttpClientResponse }>()

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
            return response.response
          }
          yield* Effect.logDebug('Cache stale')
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
  },
)

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): string => {
  return crypto.createHash('md5').update(request.url).digest('hex')
}
