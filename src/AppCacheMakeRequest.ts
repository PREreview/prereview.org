import type { HttpClientRequest, HttpClientResponse } from '@effect/platform'
import crypto from 'crypto'
import { DateTime, Effect, pipe } from 'effect'

type Foo = <E, R>(
  effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
  request: HttpClientRequest.HttpClientRequest,
) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>

export const AppCacheMakeRequest: Effect.Effect<Foo> = Effect.sync(() => {
  const cache = new Map<string, { staleAt: DateTime.DateTime; response: HttpClientResponse.HttpClientResponse }>()

  return (effect, request) =>
    Effect.gen(function* () {
      const timestamp = yield* DateTime.now
      const key = keyForRequest(request)
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
        effect,
        Effect.tap(response => cache.set(key, { staleAt: DateTime.addDuration(timestamp, '10 seconds'), response })),
      )
    })
})

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): string => {
  return crypto.createHash('md5').update(request.url).digest('hex')
}
