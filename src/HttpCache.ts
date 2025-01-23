import { Headers, HttpClientResponse, UrlParams, type HttpClientRequest } from '@effect/platform'
import { Cause, Context, Effect, Layer, Option, pipe, Schema, type DateTime } from 'effect'
import * as Redis from './Redis.js'

interface CacheValue {
  staleAt: DateTime.Utc
  response: StoredResponse
}

type CacheKey = string

type StoredResponse = typeof StoredResponseSchema.Encoded

const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: Headers.schema,
  body: Schema.String,
})

const CacheValueSchema = Schema.Struct({
  staleAt: Schema.DateTimeUtcFromNumber,
  response: StoredResponseSchema,
})

const CacheValueFromStringSchema = Schema.parseJson(CacheValueSchema)

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (
      request: HttpClientRequest.HttpClientRequest,
    ) => Effect.Effect<
      { staleAt: DateTime.Utc; response: HttpClientResponse.HttpClientResponse },
      Cause.NoSuchElementException
    >
    set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.Utc) => Effect.Effect<void, Error>
    delete: (url: URL) => Effect.Effect<void>
  }
>() {}

export const layerPersistedToRedis = Layer.effect(
  HttpCache,
  Effect.gen(function* () {
    const redis = yield* Redis.HttpCacheRedis

    return {
      get: request =>
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
          Effect.mapError(() => new Cause.NoSuchElementException()),
        ),
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
    }
  }),
)

export const layerInMemory = Layer.sync(HttpCache, () => {
  const cache = new Map<CacheKey, CacheValue>()
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
      ),
    delete: url => Effect.succeed(cache.delete(url.href)),
  }
})

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return url.href
}
