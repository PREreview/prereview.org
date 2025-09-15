import { Headers, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { it } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { DateTime, Effect, Either, Schema } from 'effect'
import type { Redis as IoRedis } from 'ioredis'
import {
  CacheValueFromStringSchema,
  InternalHttpCacheFailure,
  NoCachedResponseFound,
} from '../../src/CachingHttpClient/HttpCache.js'
import * as _ from '../../src/CachingHttpClient/PersistedToRedis.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('getFromRedis', () => {
  const stubbedRedisReturning = (value: string | null) =>
    ({
      get: (() => Promise.resolve(value)) satisfies IoRedis['get'],
      del: jest.fn(() => Promise.resolve(1)) satisfies IoRedis['del'],
    }) as unknown as IoRedis

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

          expect(result).toStrictEqual(Either.left(new NoCachedResponseFound({})))
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

        expect(result).toStrictEqual(Either.left(new NoCachedResponseFound({})))
      }).pipe(EffectTest.run),
    )
  })

  describe('redis is unreachable', () => {
    it.prop([fc.httpClientRequest(), fc.error()])('returns an error', (request, error) =>
      Effect.gen(function* () {
        const redis = {
          get: (() => Promise.reject(error)) satisfies IoRedis['get'],
        } as unknown as IoRedis

        const result = yield* Effect.either(_.getFromRedis(redis)(request))

        expect(result).toStrictEqual(Either.left(new InternalHttpCacheFailure({ cause: error.toString() })))
      }).pipe(EffectTest.run),
    )
  })
})

describe('writeToRedis', () => {
  const stubbedRedis = () =>
    ({
      set: jest.fn(() => Promise.resolve('OK' as const)) satisfies IoRedis['set'],
    }) as unknown as IoRedis

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
        expect(redis.set as unknown).toHaveBeenCalledWith(
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
    it.prop([fc.httpClientResponse(), fc.dateTimeUtc(), fc.error()])('returns an error', (response, staleAt, error) =>
      Effect.gen(function* () {
        const redis = {
          set: (() => Promise.reject<'OK'>(error)) satisfies IoRedis['set'],
        } as unknown as IoRedis

        const result = yield* Effect.either(_.writeToRedis(redis)(response, staleAt))

        expect(result).toStrictEqual(Either.left(new InternalHttpCacheFailure({ cause: error.toString() })))
      }).pipe(EffectTest.run),
    )
  })
})

describe('deleteFromRedis', () => {
  describe('the cached response can be deleted', () => {
    it.prop([fc.url()])('succeeds', url =>
      Effect.gen(function* () {
        const redis = {
          del: jest.fn(() => Promise.resolve(1)) satisfies IoRedis['del'],
        } as unknown as IoRedis

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(Either.void)
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redis.del).toHaveBeenCalledWith(_.normalizeUrl(url))
      }).pipe(EffectTest.run),
    )
  })

  describe('there is no cached response', () => {
    it.prop([fc.url()])('succeeds', url =>
      Effect.gen(function* () {
        const redis = {
          del: jest.fn(() => Promise.resolve(0)) satisfies IoRedis['del'],
        } as unknown as IoRedis

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(Either.void)
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(redis.del).toHaveBeenCalledWith(_.normalizeUrl(url))
      }).pipe(EffectTest.run),
    )
  })

  describe('redis is unreachable', () => {
    it.prop([fc.url(), fc.error()])('returns an error', (url, error) =>
      Effect.gen(function* () {
        const redis = {
          del: (() => Promise.reject(error)) satisfies IoRedis['del'],
        } as unknown as IoRedis

        const result = yield* Effect.either(_.deleteFromRedis(redis)(url))

        expect(result).toStrictEqual(Either.left(new InternalHttpCacheFailure({ cause: error.toString() })))
      }).pipe(EffectTest.run),
    )
  })
})

describe('keyForRequest', () => {
  describe('for equivalent URLs', () => {
    it.each([
      ['converting percent-encoded triplets to uppercase', 'http://example.com/foo%2a', 'http://example.com/foo%2A'],
      ['converting the scheme and host to lowercase', 'HTTP://User@Example.COM/Foo', 'http://User@example.com/Foo'],
      [
        'decoding percent-encoded triplets of unreserved characters',
        'http://example.com/%7Efoo',
        'http://example.com/~foo',
      ],
      ['removing dot-segments', 'http://example.com/foo/./bar/baz/../qux', 'http://example.com/foo/bar/qux'],
      ['converting an empty path to a "/" path', 'http://example.com', 'http://example.com/'],
      ['removing the default port', 'http://example.com:80/', 'http://example.com/'],
      ['removing the fragment', 'http://example.com/foo#bar', 'http://example.com/foo'],
      ['removing duplicate slashes', 'http://example.com/foo//bar.html', 'http://example.com/foo/bar.html'],
      [
        'sorting the query parameters',
        'http://example.com/display?lang=en&article=fred',
        'http://example.com/display?article=fred&lang=en',
      ],
      ['removing the "?" when the query is empty', 'http://example.com?', 'http://example.com'],
    ])('the keys are the same (%s)', (_name, url1, url2) => {
      const request1 = HttpClientRequest.get(url1)
      const request2 = HttpClientRequest.get(url2)

      const key1 = _.keyForRequest(request1)
      const key2 = _.keyForRequest(request2)

      expect(key1).toStrictEqual(key2)
    })
  })

  describe('for nonequivalent URLs', () => {
    it.each([
      ['adding a trailing "/" to a non-empty path', 'http://example.com/foo', 'http://example.com/foo/'],
      ['removing directory index', 'http://example.com/a/index.html', 'http://example.com/a/'],
      ['replacing IP with domain name', 'http://208.77.188.166/', 'http://example.com/'],
      ['limiting protocols', 'http://example.com/', 'https://example.com/'],
      ['removing or adding “www” as the first domain label', 'http://example.com/', 'http://www.example.com/'],
      [
        'removing unused query variables',
        'http://example.com/display?id=123&fakefoo=fakebar',
        'http://example.com/display?id=123',
      ],
      [
        'removing default query parameters',
        'http://example.com/display?id=&sort=ascending',
        'http://example.com/display',
      ],
    ])('the keys are different (%s)', (_name, url1, url2) => {
      const request1 = HttpClientRequest.get(url1)
      const request2 = HttpClientRequest.get(url2)

      const key1 = _.keyForRequest(request1)
      const key2 = _.keyForRequest(request2)

      expect(key1).not.toStrictEqual(key2)
    })
  })
})
