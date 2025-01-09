import { type HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Effect, pipe } from 'effect'

export const AppCacheMakeRequest: <E, R>(
  effect: Effect.Effect<HttpClientResponse.HttpClientResponse, E, R>,
  request: HttpClientRequest.HttpClientRequest,
) => Effect.Effect<HttpClientResponse.HttpClientResponse, E, R> = (effect, request) =>
  pipe(
    Effect.succeed(HttpClientResponse.fromWeb(request, new Response())),
    Effect.tap(Effect.logDebug('Making request in background')),
    Effect.tap(() => effect),
  )
