import { Headers, type HttpClientRequest, HttpClientResponse, UrlParams } from 'effect/http'
import { Effect, Layer, Option, pipe, Schema } from 'effect'
import type { Redis as IoRedis } from 'ioredis'
import _normalizeUrl from 'normalize-url'
import * as Redis from '../Redis.ts'
import { CacheValueFromStringSchema, HttpCache, InternalHttpCacheFailure } from './HttpCache.ts'

export const layerPersistedToRedis = Layer.effect(
  HttpCache,
  Effect.gen(function* () {
    const redis = yield* Redis.HttpCacheRedis

    return {
      get: request =>
        redis.primary.status === 'ready'
          ? getFromRedis(redis.primary)(request)
          : getFromRedis(redis.readonlyFallback)(request),
      set: writeToRedis(redis.primary),
      delete: deleteFromRedis(redis.primary),
    }
  }),
)

export const getFromRedis =
  (redis: IoRedis): (typeof HttpCache.Service)['get'] =>
  request =>
    pipe(
      Effect.tryPromise({ try: () => redis.get(keyForRequest(request)), catch: String }),
      Effect.andThen(Effect.fromNullishOr),
      Effect.andThen(Schema.decodeEffect(CacheValueFromStringSchema)),
      Effect.map(({ staleAt, response }) => ({
        staleAt,
        response: HttpClientResponse.fromWeb(
          request,
          new Response(response.body !== '' ? response.body : undefined, {
            status: response.status,
            headers: Headers.fromInput(response.headers),
          }),
        ),
      })),
      Effect.catchTag('SchemaError', () =>
        pipe(
          Effect.tryPromise({ try: () => redis.del(keyForRequest(request)), catch: String }),
          Effect.andThen(() => Effect.fromOption(Option.none())),
        ),
      ),
      Effect.catchIf(
        error => typeof error === 'string',
        cause => new InternalHttpCacheFailure({ cause }),
      ),
      Effect.catchNoSuchElement,
      Effect.uninterruptible,
      Effect.withSpan('PersistedToRedis.getFromRedis'),
    )

export const writeToRedis =
  (redis: IoRedis): (typeof HttpCache.Service)['set'] =>
  (response, staleAt) =>
    pipe(
      Effect.gen(function* () {
        return {
          staleAt,
          response: {
            status: response.status,
            headers: response.headers,
            body: yield* response.text,
          },
        }
      }),
      Effect.andThen(Schema.encodeEffect(CacheValueFromStringSchema)),
      Effect.andThen(value =>
        Effect.tryPromise({
          try: () => redis.set(keyForRequest(response.request), value),
          catch: String,
        }),
      ),
      Effect.asVoid,
      Effect.catch(cause => new InternalHttpCacheFailure({ cause })),
      Effect.uninterruptible,
      Effect.withSpan('PersistedToRedis.writeToRedis'),
    )

export const deleteFromRedis =
  (redis: IoRedis): (typeof HttpCache.Service)['delete'] =>
  url =>
    pipe(
      Effect.tryPromise({ try: () => redis.del(normalizeUrl(url)), catch: String }),
      Effect.asVoid,
      Effect.catch(cause => new InternalHttpCacheFailure({ cause })),
      Effect.uninterruptible,
      Effect.withSpan('PersistedToRedis.deleteFromRedis'),
    )

export type CacheKey = string

export const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = pipe(UrlParams.fromInput(url.searchParams), UrlParams.appendAll(request.urlParams), UrlParams.toString)

  return normalizeUrl(url)
}

export const normalizeUrl = (url: URL) =>
  _normalizeUrl(url.href, { removeTrailingSlash: false, stripHash: true, stripWWW: false })
