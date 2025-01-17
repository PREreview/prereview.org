import { Headers, HttpClientResponse, UrlParams, type HttpClientRequest } from '@effect/platform'
import { Context, Effect, Layer, Option, pipe, Schema, type Cause, type DateTime } from 'effect'

interface CacheValue {
  staleAt: DateTime.DateTime
  response: StoredResponse
}

type CacheKey = string

type StoredResponse = typeof StoredResponseSchema.Encoded

const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: Headers.schema,
  body: Schema.String,
})

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (
      request: HttpClientRequest.HttpClientRequest,
    ) => Effect.Effect<
      { staleAt: DateTime.DateTime; response: HttpClientResponse.HttpClientResponse },
      Cause.NoSuchElementException
    >
    set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.DateTime) => Effect.Effect<void, Error>
    delete: (url: URL) => Effect.Effect<void>
  }
>() {}

export const layer = Layer.sync(HttpCache, () => {
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
