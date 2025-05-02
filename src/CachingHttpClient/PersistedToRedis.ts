import { Headers, type HttpClientRequest, HttpClientResponse, UrlParams } from '@effect/platform'
import { Effect, Either, Layer, pipe, Schema } from 'effect'
import _normalizeUrl from 'normalize-url'
import * as Redis from '../Redis.js'
import { CacheValueFromStringSchema, HttpCache, InternalHttpCacheFailure, NoCachedResponseFound } from './HttpCache.js'
import { serializationErrorChecking } from './SerializationErrorChecking.js'

export const layerPersistedToRedis = Layer.effect(
  HttpCache,
  Effect.gen(function* () {
    const externalRedisMaster = yield* Redis.HttpCacheRedis
    const inMemoryRedisReplica = yield* Redis.HttpCacheRedisInMemoryReplica

    return pipe(
      {
        get: getFromRedis(inMemoryRedisReplica),
        set: writeToRedis(externalRedisMaster),
        delete: deleteFromRedis(externalRedisMaster),
      },
      serializationErrorChecking,
    )
  }),
)

export const getFromRedis =
  (redis: typeof Redis.HttpCacheRedis.Service): (typeof HttpCache.Service)['get'] =>
  request =>
    pipe(
      Effect.tryPromise(() => redis.get(keyForRequest(request))),
      Effect.andThen(Either.fromNullable(() => new NoCachedResponseFound({}))),
      Effect.andThen(Schema.decode(CacheValueFromStringSchema)),
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
      Effect.catchTag('ParseError', cause =>
        pipe(
          Effect.tryPromise(() => redis.del(keyForRequest(request))),
          Effect.andThen(() => new NoCachedResponseFound({ cause })),
        ),
      ),
      Effect.catchTag('UnknownException', cause => new InternalHttpCacheFailure({ cause })),
    )

export const writeToRedis =
  (redis: typeof Redis.HttpCacheRedis.Service): (typeof HttpCache.Service)['set'] =>
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
      Effect.andThen(Schema.encode(CacheValueFromStringSchema)),
      Effect.andThen(value => {
        return redis.set(keyForRequest(response.request), value)
      }),
      Effect.asVoid,
      Effect.catchAll(cause => new InternalHttpCacheFailure({ cause })),
    )

export const deleteFromRedis =
  (redis: typeof Redis.HttpCacheRedis.Service): (typeof HttpCache.Service)['delete'] =>
  url =>
    pipe(
      Effect.tryPromise(() => redis.del(normalizeUrl(url))),
      Effect.asVoid,
      Effect.catchAll(cause => new InternalHttpCacheFailure({ cause })),
    )

export type CacheKey = string

export const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = pipe(UrlParams.fromInput(url.searchParams), UrlParams.appendAll(request.urlParams), UrlParams.toString)

  return normalizeUrl(url)
}

export const normalizeUrl = (url: URL) =>
  _normalizeUrl(url.href, { removeTrailingSlash: false, stripHash: true, stripWWW: false })
