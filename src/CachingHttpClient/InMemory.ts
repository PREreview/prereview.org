import { Headers, HttpClientResponse } from '@effect/platform'
import { Effect, Layer, Option, pipe, Schema } from 'effect'
import {
  type CacheKey,
  type CacheValue,
  HttpCache,
  InternalHttpCacheFailure,
  keyForRequest,
  StoredResponseSchema,
} from './HttpCache.js'

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
              new Response(response.body, {
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
