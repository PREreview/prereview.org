import { Headers, HttpClientResponse } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Cause, DateTime, Effect, Either, Schema } from 'effect'
import { CacheValueFromStringSchema, InternalHttpCacheFailure } from '../../src/CachingHttpClient/HttpCache.js'
import * as _ from '../../src/CachingHttpClient/PersistedToRedis.js'
import type * as Redis from '../../src/Redis.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('getFromRedis', () => {
  const stubbedRedisReturning = (value: string | null) =>
    ({
      get: (() => Promise.resolve(value)) satisfies (typeof Redis.HttpCacheRedis.Service)['get'],
      del: jest.fn(() => Promise.resolve(1)) satisfies (typeof Redis.HttpCacheRedis.Service)['del'],
    }) as unknown as typeof Redis.HttpCacheRedis.Service

  describe('there is a value for a given key', () => {
    describe('the value can be read', () => {
      it.prop([fc.httpClientRequest()])('succeeds', request =>
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
        }).pipe(EffectTest.run),
      )
    })

    describe('the value can not be read', () => {
      it.prop([fc.httpClientRequest(), fc.string()])('returns not found', (request, unreadableValue) =>
        Effect.gen(function* () {
          const redis = stubbedRedisReturning(unreadableValue)

          const result = yield* Effect.either(_.getFromRedis(redis)(request))

          expect(result).toStrictEqual(Either.left(new Cause.NoSuchElementException()))
        }).pipe(EffectTest.run),
      )

      it.prop([fc.httpClientRequest(), fc.string()])('removes the value', (request, unreadableValue) =>
        Effect.gen(function* () {
          const redis = stubbedRedisReturning(unreadableValue)

          yield* Effect.either(_.getFromRedis(redis)(request))

          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(redis.del).toHaveBeenCalledTimes(1)
        }).pipe(EffectTest.run),
      )
    })
  })

  describe('there is no value for a given key', () => {
    it.prop([fc.httpClientRequest()])('returns not found', request =>
      Effect.gen(function* () {
        const redis = stubbedRedisReturning(null)

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(Either.left(new Cause.NoSuchElementException()))
      }).pipe(EffectTest.run),
    )
  })

  describe('redis is unreachable', () => {
    it.prop([fc.httpClientRequest(), fc.anything()])('returns an error', (request, error) =>
      Effect.gen(function* () {
        const redis = {
          get: (() => Promise.reject(error)) satisfies (typeof Redis.HttpCacheRedis.Service)['get'],
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(
          Either.left(new InternalHttpCacheFailure({ cause: new Cause.UnknownException(error) })),
        )
      }).pipe(EffectTest.run),
    )
  })
})

describe('writeToRedis', () => {
  const stubbedRedis = () =>
    ({
      set: jest.fn(() => Promise.resolve('OK' as const)) satisfies (typeof Redis.HttpCacheRedis.Service)['set'],
    }) as unknown as typeof Redis.HttpCacheRedis.Service

  describe('the value can be written', () => {
    it.prop([
      fc.string().chain(text => fc.tuple(fc.httpClientResponse({ text: fc.constant(text) }), fc.constant(text))),
      fc.dateTimeUtc(),
    ])('succeeds', ([response, body], staleAt) =>
      Effect.gen(function* () {
        const redis = stubbedRedis()

        const result = yield* Effect.either(_.writeToRedis(redis)(response, staleAt))

        expect(result).toStrictEqual(Either.right(undefined))
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redis.set).toHaveBeenCalledWith(
          _.keyForRequest(response.request),
          expect.stringContaining(JSON.stringify(body)),
        )
      }).pipe(EffectTest.run),
    )
  })

  describe('the response body can not be read', () => {
    it.prop([fc.httpClientRequest(), fc.dateTimeUtc(), fc.nonEmptyString()])(
      'returns an error without touching redis',
      (request, staleAt, body) =>
        Effect.gen(function* () {
          const fetchResponse = new Response(body)
          const response = HttpClientResponse.fromWeb(request, fetchResponse)
          const redis = stubbedRedis()
          yield* Effect.promise(async () => fetchResponse.body?.cancel())

          const result = yield* Effect.either(_.writeToRedis(redis)(response, staleAt))

          expect(result).toStrictEqual(Either.left(expect.anything()))
          // eslint-disable-next-line @typescript-eslint/unbound-method
          expect(redis.set).not.toHaveBeenCalled()
        }).pipe(EffectTest.run),
    )
  })

  describe('redis is unreachable', () => {
    it.prop([fc.httpClientResponse(), fc.dateTimeUtc(), fc.anything()])(
      'returns an error',
      (response, staleAt, error) =>
        Effect.gen(function* () {
          const redis = {
            set: (() => Promise.reject<'OK'>(error)) satisfies (typeof Redis.HttpCacheRedis.Service)['set'],
          } as unknown as typeof Redis.HttpCacheRedis.Service

          const result = yield* Effect.either(_.writeToRedis(redis)(response, staleAt))

          expect(result).toStrictEqual(
            Either.left(new InternalHttpCacheFailure({ cause: new Cause.UnknownException(error) })),
          )
        }).pipe(EffectTest.run),
    )
  })
})

describe('deleteFromRedis', () => {
  describe('the cached response can be deleted', () => {
    it.prop([fc.url()])('succeeds', url =>
      Effect.gen(function* () {
        const redis = {
          del: jest.fn(() => Promise.resolve(1)) satisfies (typeof Redis.HttpCacheRedis.Service)['del'],
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(Either.void)
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redis.del).toHaveBeenCalledWith(url.href)
      }).pipe(EffectTest.run),
    )
  })

  describe('there is no cached response', () => {
    it.prop([fc.url()])('succeeds', url =>
      Effect.gen(function* () {
        const redis = {
          del: jest.fn(() => Promise.resolve(0)) satisfies (typeof Redis.HttpCacheRedis.Service)['del'],
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(Either.void)
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redis.del).toHaveBeenCalledWith(url.href)
      }).pipe(EffectTest.run),
    )
  })

  describe('redis is unreachable', () => {
    it.prop([fc.url(), fc.anything()])('returns an error', (url, error) =>
      Effect.gen(function* () {
        const redis = {
          del: (() => Promise.reject(error)) satisfies (typeof Redis.HttpCacheRedis.Service)['del'],
        } as unknown as typeof Redis.HttpCacheRedis.Service

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(
          Either.left(new InternalHttpCacheFailure({ cause: new Cause.UnknownException(error) })),
        )
      }).pipe(EffectTest.run),
    )
  })
})
