import { Headers, type HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { Effect, Either, Layer, pipe, Schema } from 'effect'
import _normalizeUrl from 'normalize-url'
import {
  type CacheValue,
  HttpCache,
  InternalHttpCacheFailure,
  NoCachedResponseFound,
  StoredResponseSchema,
} from './HttpCache.ts'

export type CacheKey = string

export const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = pipe(UrlParams.fromInput(url.searchParams), UrlParams.appendAll(request.urlParams), UrlParams.toString)

  return normalizeUrl(url)
}

export const normalizeUrl = (url: URL) =>
  _normalizeUrl(url.href, { removeTrailingSlash: false, stripHash: true, stripWWW: false })

export const layerInMemory = (cache = new Map<CacheKey, CacheValue>()) =>
  Layer.sync(HttpCache, () => {
    return {
      get: request =>
        pipe(
          cache.get(keyForRequest(request)),
          Either.fromNullable(() => new NoCachedResponseFound({})),
          Either.andThen(({ staleAt, response }) => ({
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
      delete: url => Effect.succeed(cache.delete(normalizeUrl(url))),
    }
  })
