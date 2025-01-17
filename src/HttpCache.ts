import { Headers, type HttpClientResponse } from '@effect/platform'
import { Context, type DateTime, Effect, Layer, pipe, Schema } from 'effect'

interface CacheValue {
  staleAt: DateTime.DateTime
  response: StoredResponse
}

interface CacheInput {
  staleAt: DateTime.DateTime
  response: HttpClientResponse.HttpClientResponse
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
    set: (key: CacheKey, value: CacheInput) => Effect.Effect<void, Error>
    delete: (key: CacheKey) => Effect.Effect<void>
  }
>() {}

export const layer = Layer.sync(HttpCache, () => {
  const cache = new Map<string, CacheValue>()
  return {
    get: key => Effect.succeed(cache.get(key.href)),
    set: (key, input) =>
      pipe(
        Effect.gen(function* () {
          return {
            status: input.response.status,
            headers: input.response.headers,
            body: yield* input.response.text,
          }
        }),
        Effect.andThen(Schema.encode(StoredResponseSchema)),
        Effect.andThen(storedResponse => {
          cache.set(key.href, { staleAt: input.staleAt, response: storedResponse })
        }),
      ),
    delete: key => Effect.succeed(cache.delete(key.href)),
  }
})
