import { Headers, type HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { Effect, Layer, Option, pipe, Schema } from 'effect'
import { type CacheValue, HttpCache, InternalHttpCacheFailure, StoredResponseSchema } from './HttpCache.js'

export type CacheKey = string

export const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return url.href
}

export const layerInMemory = (cache = new Map<CacheKey, CacheValue>()) =>
  Layer.sync(HttpCache, () => {
    return {
      get: request =>
        pipe(
          cache.get(keyForRequest(request)),
          Option.fromNullable,
          Option.map(({ staleAt, response }) => ({
            staleAt,
            response: HttpClientResponse.fromWeb(
              request,
              new Response(response.body !== '' ? response.body : undefined, {
                status: response.status,
                headers: Headers.fromInput(response.headers),
              }),
            ),
          })),
        ),
      set: (response, staleAt) =>
        pipe(
          Effect.gen(function* () {
            return {
              status: response.status,
              headers: response.headers,
              body: yield* response.text,
            }
          }),
          Effect.andThen(Schema.encode(StoredResponseSchema)),
          Effect.andThen(storedResponse => {
            cache.set(keyForRequest(response.request), { staleAt, response: storedResponse })
          }),
          Effect.catchAll(cause => new InternalHttpCacheFailure({ cause })),
        ),
      delete: url => Effect.succeed(cache.delete(url.href)),
    }
  })
