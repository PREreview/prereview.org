import { HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe } from '@jest/globals'
import { expect } from '@playwright/test'
import { DateTime, Effect, flow, Logger, LogLevel, pipe, TestContext } from 'effect'
import { HttpCache } from '../../src/CachingHttpClient/HttpCache.js'
import { layerInMemory } from '../../src/CachingHttpClient/InMemory.js'
import { serializationErrorChecking } from '../../src/CachingHttpClient/SerializationErrorChecking.js'
import * as fc from '../fc.js'

const effectTestBoilerplate = flow(Effect.provide(TestContext.TestContext), Logger.withMinimumLogLevel(LogLevel.None))

describe('when the cached response matches the original', () => {
  it.prop([fc.url()])('the response is left in the cache', url =>
    Effect.gen(function* () {
      const cacheStorage = new Map()

      const response = HttpClientResponse.fromWeb(
        HttpClientRequest.get(url),
        new Response('original response body', { headers: [['foo', 'bar']] }),
      )
      const staleAt = yield* DateTime.now

      yield* pipe(
        HttpCache,
        Effect.andThen(serializationErrorChecking),
        Effect.andThen(httpCache => httpCache.set(response, staleAt)),
        Effect.provide(layerInMemory(cacheStorage)),
      )

      expect(cacheStorage.size).toBe(1)
    }).pipe(effectTestBoilerplate, Effect.runPromise),
  )
})

describe('when the cached response does not match the original', () => {
  it.prop([fc.url()])('the response is removed from the cache', url =>
    Effect.gen(function* () {
      const cacheStorage = new Map()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const healthySetMethod = cacheStorage.set
      cacheStorage.set = function (key, value) {
        return healthySetMethod.call(this, key, { ...value, response: 'bogus' })
      }

      const response = HttpClientResponse.fromWeb(
        HttpClientRequest.get(url),
        new Response('original response body', { headers: [['foo', 'bar']] }),
      )
      const staleAt = yield* DateTime.now

      yield* pipe(
        HttpCache,
        Effect.andThen(serializationErrorChecking),
        Effect.andThen(httpCache => httpCache.set(response, staleAt)),
        Effect.provide(layerInMemory(cacheStorage)),
      )

      expect(cacheStorage.size).toBe(0)
    }).pipe(effectTestBoilerplate, Effect.runPromise),
  )
})
