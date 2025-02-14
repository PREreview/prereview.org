import { Headers, HttpClientRequest } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Cause, DateTime, Effect, Either, Schema, TestContext } from 'effect'
import { CacheValueFromStringSchema } from '../../src/CachingHttpClient/HttpCache.js'
import * as _ from '../../src/CachingHttpClient/PersistedToRedis.js'
import type * as Redis from '../../src/Redis.js'
import * as fc from '../fc.js'

describe('getFromRedis', () => {
  describe('there is a value for a given key', () => {
    describe('the value can be read', () => {
      it('succeeds', () =>
        Effect.gen(function* () {
          const request = HttpClientRequest.get('http://example.com')
          const decodableValue = yield* Schema.encode(CacheValueFromStringSchema)({
            staleAt: yield* DateTime.now,
            response: {
              status: 200,
              headers: Headers.empty,
              body: '',
            },
          })
          const redis = {
            get: () => Promise.resolve(decodableValue),
          } as unknown as typeof Redis.HttpCacheRedis.Service

          const result = yield* Effect.either(_.getFromRedis(redis)(request))

          expect(result).toStrictEqual(Either.right(expect.anything()))
        }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise))
    })

    describe('the value can not be read', () => {
      it.todo('returns not found')

      it.todo('removes the value')
    })
  })

  describe('there is no value for a given key', () => {
    it('returns not found', () =>
      Effect.gen(function* () {
        const request = HttpClientRequest.get('http://example.com')
        const redis = {
          get: () => Promise.resolve(null),
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(Either.left(new Cause.NoSuchElementException()))
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise))
  })

  describe('redis is unreachable', () => {
    it.failing.prop([fc.anything()])('returns an error', error =>
      Effect.gen(function* () {
        const request = HttpClientRequest.get('http://example.com')
        const redis = {
          get: () => Promise.reject(error),
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(Either.left(new Cause.UnknownException(error)))
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
    )
  })
})
