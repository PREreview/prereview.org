import { Headers, HttpClientResponse } from '@effect/platform'
import { Cause, Effect, Layer, Option, pipe, Schema } from 'effect'
import * as Redis from '../Redis.js'
import { CacheValueFromStringSchema, HttpCache, keyForRequest } from './HttpCache.js'
import { serializationErrorChecking } from './SerializationErrorChecking.js'

export const layerPersistedToRedis = Layer.effect(
  HttpCache,
  Effect.gen(function* () {
    const redis = yield* Redis.HttpCacheRedis

    return pipe(
      {
        get: getFromRedis(redis),
        set: (response, staleAt) =>
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
          ),
        delete: () => Effect.void,
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
      Effect.andThen(Option.fromNullable),
      Effect.andThen(Schema.decode(CacheValueFromStringSchema)),
      Effect.map(({ staleAt, response }) => ({
        staleAt,
        response: HttpClientResponse.fromWeb(
          request,
          new Response(response.body, {
            status: response.status,
            headers: Headers.fromInput(response.headers),
          }),
        ),
      })),
      Effect.catchTag('ParseError', () =>
        pipe(
          Effect.tryPromise(() => redis.del(keyForRequest(request))),
          Effect.andThen(new Cause.NoSuchElementException()),
        ),
      ),
    )
