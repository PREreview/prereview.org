import { Headers, HttpClientRequest } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Cause, DateTime, Effect, Either, Schema, TestContext } from 'effect'
import { CacheValueFromStringSchema, InternalHttpCacheFailure } from '../../src/CachingHttpClient/HttpCache.js'
import * as _ from '../../src/CachingHttpClient/PersistedToRedis.js'
import type * as Redis from '../../src/Redis.js'
import * as fc from '../fc.js'

describe('getFromRedis', () => {
  const request = HttpClientRequest.get('http://example.com')
  const stubbedRedisReturning = (value: string | null) =>
    ({
      get: () => Promise.resolve(value),
      del: jest.fn(() => Promise.resolve(1)),
    }) as unknown as typeof Redis.HttpCacheRedis.Service

  describe('there is a value for a given key', () => {
    describe('the value can be read', () => {
      it('succeeds', () =>
        Effect.gen(function* () {
          const decodableValue = yield* Schema.encode(CacheValueFromStringSchema)({
            staleAt: yield* DateTime.now,
            response: {
              status: 200,
              headers: Headers.empty,
              body: '',
            },
          })
          const redis = stubbedRedisReturning(decodableValue)

          const result = yield* Effect.either(_.getFromRedis(redis)(request))

          expect(result).toStrictEqual(Either.right(expect.anything()))
        }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise))
    })

    describe('the value can not be read', () => {
      it.prop([fc.string()])('returns not found', unreadableValue =>
        Effect.gen(function* () {
          const redis = stubbedRedisReturning(unreadableValue)

          const result = yield* Effect.either(_.getFromRedis(redis)(request))

          expect(result).toStrictEqual(Either.left(new Cause.NoSuchElementException()))
        }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
      )

      it.prop([fc.string()])('removes the value', unreadableValue =>
        Effect.gen(function* () {
          const redis = stubbedRedisReturning(unreadableValue)

          yield* Effect.either(_.getFromRedis(redis)(request))

          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(redis.del).toHaveBeenCalledTimes(1)
        }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
      )
    })
  })

  describe('there is no value for a given key', () => {
    it('returns not found', () =>
      Effect.gen(function* () {
        const redis = stubbedRedisReturning(null)

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(Either.left(new Cause.NoSuchElementException()))
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise))
  })

  describe('redis is unreachable', () => {
    it.prop([fc.anything()])('returns an error', error =>
      Effect.gen(function* () {
        const redis = {
          get: () => Promise.reject(error),
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(
          Either.left(new InternalHttpCacheFailure({ cause: new Cause.UnknownException(error) })),
        )
      }).pipe(Effect.provide(TestContext.TestContext), Effect.runPromise),
    )
  })
})

describe('writeToRedis', () => {
  describe('the value can be written', () => {
    it.todo('succeeds')
  })

  describe('the response body can not be read', () => {
    it.todo('returns an error without touching redis')
  })

  describe('redis is unreachable', () => {
    it.todo('returns an error')
  })
})
