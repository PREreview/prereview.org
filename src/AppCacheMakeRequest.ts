import type { HttpClientRequest, HttpClientResponse } from '@effect/platform'
import crypto from 'crypto'
import { Effect, pipe } from 'effect'

const cache = new Map<string, HttpClientResponse.HttpClientResponse>()

export const AppCacheMakeRequest: <E, R>(
  effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
  request: HttpClientRequest.HttpClientRequest,
) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R> = (effect, request) =>
  Effect.gen(function* () {
    const key = keyForRequest(request)

    const response = cache.get(key)

    if (response) {
      yield* Effect.logDebug('Cache hit')
      return response
    }

    return yield* pipe(
      Effect.logDebug('Cache miss'),
      Effect.andThen(effect),
      Effect.tap(response => cache.set(key, response)),
    )
  })

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): string => {
  return crypto.createHash('md5').update(request.url).digest('hex')
}
