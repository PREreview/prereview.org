import type { HttpClientResponse } from '@effect/platform'
import { Context, type DateTime, Effect, Layer } from 'effect'

export interface CacheValue {
  staleAt: DateTime.DateTime
  response: HttpClientResponse.HttpClientResponse
}

export type CacheKey = URL

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (key: CacheKey) => Effect.Effect<CacheValue | undefined>
    set: (key: CacheKey, value: CacheValue) => Effect.Effect<void>
    delete: (key: CacheKey) => Effect.Effect<void>
  }
>() {}

export const layer = Layer.sync(HttpCache, () => {
  const cache = new Map<string, CacheValue>()
  return {
    get: key => Effect.succeed(cache.get(key.href)),
    set: (key, value) => Effect.succeed(cache.set(key.href, value)),
    delete: key => Effect.succeed(cache.delete(key.href)),
  }
})
