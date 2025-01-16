import type { HttpClientResponse } from '@effect/platform'
import { Context, type DateTime, Layer } from 'effect'

export interface CacheValue {
  staleAt: DateTime.DateTime
  response: HttpClientResponse.HttpClientResponse
}

export type CacheKey = URL

export class HttpCache extends Context.Tag('HttpCache')<
  HttpCache,
  {
    get: (key: CacheKey) => CacheValue | undefined
    set: (key: CacheKey, value: CacheValue) => void
    delete: (key: CacheKey) => void
  }
>() {}

export const layer = Layer.sync(HttpCache, () => {
  const cache = new Map<string, CacheValue>()
  return {
    get: key => cache.get(key.href),
    set: (key, value) => cache.set(key.href, value),
    delete: key => cache.delete(key.href),
  }
})
