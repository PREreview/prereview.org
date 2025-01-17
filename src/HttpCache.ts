import { Headers, UrlParams, type HttpClientRequest, type HttpClientResponse } from '@effect/platform'
import { Context, Effect, Layer, pipe, Schema, type DateTime } from 'effect'

interface CacheValue {
  staleAt: DateTime.DateTime
  response: StoredResponse
}

export type CacheKey = URL

type StoredResponse = typeof StoredResponseSchema.Encoded

const StoredResponseSchema = Schema.Struct({
  status: Schema.Number,
  headers: Headers.schema,
  body: Schema.String,
})

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (key: CacheKey) => Effect.Effect<CacheValue | undefined>
    set: (response: HttpClientResponse.HttpClientResponse, staleAt: DateTime.DateTime) => Effect.Effect<void, Error>
    delete: (key: CacheKey) => Effect.Effect<void>
  }
>() {}

export const layer = Layer.sync(HttpCache, () => {
  const cache = new Map<string, CacheValue>()
  return {
    get: key => Effect.succeed(cache.get(key.href)),
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
          cache.set(keyForRequest(response.request).href, { staleAt, response: storedResponse })
        }),
      ),
    delete: key => Effect.succeed(cache.delete(key.href)),
  }
})

const keyForRequest = (request: HttpClientRequest.HttpClientRequest): CacheKey => {
  const url = new URL(request.url)
  url.search = UrlParams.toString(request.urlParams)

  return url
}
