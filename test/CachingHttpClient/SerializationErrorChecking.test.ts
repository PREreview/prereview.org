import { it } from '@fast-check/jest'
import { describe } from '@jest/globals'
import { expect } from '@playwright/test'
import { DateTime, Effect, pipe } from 'effect'
import { HttpCache } from '../../src/CachingHttpClient/HttpCache.ts'
import { layerInMemory } from '../../src/CachingHttpClient/InMemory.ts'
import { serializationErrorChecking } from '../../src/CachingHttpClient/SerializationErrorChecking.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('when the cached response matches the original', () => {
  it.prop([fc.httpClientResponse()])('the response is left in the cache', response =>
    Effect.gen(function* () {
      const cacheStorage = new Map()

      const staleAt = yield* DateTime.now

      yield* pipe(
        HttpCache,
        Effect.andThen(serializationErrorChecking),
        Effect.andThen(httpCache => httpCache.set(response, staleAt)),
        Effect.provide(layerInMemory(cacheStorage)),
      )

      expect(cacheStorage.size).toBe(1)
    }).pipe(EffectTest.run),
  )
})

describe('when the cached response does not match the original', () => {
  it.prop([fc.httpClientResponse()])('the response is removed from the cache', response =>
    Effect.gen(function* () {
      const cacheStorage = new Map()
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const healthySetMethod = cacheStorage.set
      cacheStorage.set = function (key, value) {
        return healthySetMethod.call(this, key, { ...value, response: 'bogus' })
      }

      const staleAt = yield* DateTime.now

      yield* pipe(
        HttpCache,
        Effect.andThen(serializationErrorChecking),
        Effect.andThen(httpCache => httpCache.set(response, staleAt)),
        Effect.provide(layerInMemory(cacheStorage)),
      )

      expect(cacheStorage.size).toBe(0)
    }).pipe(EffectTest.run),
  )
})
