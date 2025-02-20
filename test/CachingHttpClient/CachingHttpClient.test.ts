import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import {
  Cause,
  type Duration,
  Effect,
  Either,
  Fiber,
  flow,
  Logger,
  LogLevel,
  Option,
  pipe,
  TestClock,
  TestContext,
} from 'effect'
import { StatusCodes } from 'http-status-codes'
import * as _ from '../../src/CachingHttpClient/index.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

const stubbedClient = (
  response: HttpClientResponse.HttpClientResponse,
  responseDuration: Duration.DurationInput = 0,
): HttpClient.HttpClient.With<never, never> =>
  HttpClient.makeWith(() => Effect.succeed(response).pipe(Effect.delay(responseDuration)), Effect.succeed)

const stubbedFailingClient = (
  error: HttpClientError.HttpClientError,
): HttpClient.HttpClient.With<HttpClientError.HttpClientError, never> =>
  HttpClient.makeWith(() => Effect.fail(error), Effect.succeed)

const shouldNotBeCalledHttpClient: HttpClient.HttpClient.With<HttpClientError.HttpClientError, never> =
  HttpClient.makeWith(() => {
    throw new Error('should not make any http requests with HttpClient')
  }, Effect.succeed)

const effectTestBoilerplate = flow(
  Effect.scoped,
  Effect.provide(TestContext.TestContext),
  Logger.withMinimumLogLevel(LogLevel.None),
)

describe('there is no cache entry', () => {
  describe('the request succeeds', () => {
    test.prop([fc.url(), fc.durationInput()])('able to cache it', (url, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse)),
          Effect.provide(_.layerInMemory(cache)),
        )

        const actualResponse = yield* client.get(url)
        expect(actualResponse).toStrictEqual(successfulResponse)
        expect(cache.size).toBe(1)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
    )

    test.prop([fc.url(), fc.error(), fc.durationInput()])('not able to cache it', (url, error, timeToStale) =>
      Effect.gen(function* () {
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse)),
          Effect.provideService(_.HttpCache, {
            get: () => Option.none(),
            set: () => Effect.fail(error),
            delete: () => Effect.void,
          }),
        )
        const actualResponse = yield* client.get(url)
        expect(actualResponse).toStrictEqual(successfulResponse)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
    )
  })

  describe('the request fails', () => {
    test.prop([fc.url(), fc.durationInput()])('with a timeout', (url, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse, '3 seconds')),
          Effect.provide(_.layerInMemory(cache)),
        )

        const fiber = yield* pipe(client.get(url), Effect.either, Effect.fork)
        yield* TestClock.adjust('3 seconds')
        const actualResponse = yield* Fiber.join(fiber)

        expect(actualResponse).toStrictEqual(Either.left(expect.objectContaining({ _tag: 'RequestError' })))
        expect(cache.size).toBe(0)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
    )

    test.prop([fc.url(), fc.durationInput()])('with a network error', (url, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const error = new HttpClientError.RequestError({ request: HttpClientRequest.get(url), reason: 'Transport' })
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedFailingClient(error)),
          Effect.provide(_.layerInMemory(cache)),
        )

        const actualResponse = yield* Effect.either(client.get(url))

        expect(actualResponse).toStrictEqual(Either.left(error))
        expect(cache.size).toBe(0)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
    )

    test.failing.prop([fc.url(), fc.statusCode().filter(status => status !== StatusCodes.OK), fc.durationInput()])(
      'with a response that does not have a 200 status code',
      (url, status, timeToStale) =>
        Effect.gen(function* () {
          const cache = new Map()
          const response = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response(null, { status }))
          const client = yield* pipe(
            _.CachingHttpClient(timeToStale),
            Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
            Effect.provide(_.layerInMemory(cache)),
          )

          const actualResponse = yield* client.get(url)

          expect(actualResponse).toStrictEqual(response)
          expect(cache.size).toBe(0)
        }).pipe(effectTestBoilerplate, Effect.runPromise),
    )
  })
})

describe('there is a cache entry', () => {
  describe('the cached response is fresh', () => {
    test.failing.prop([fc.url()])('the cached response is returned without making any requests', url =>
      Effect.gen(function* () {
        const timeToStale = '5 seconds'
        const cache = new Map()
        const originalResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const clientToPopulateCache = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(originalResponse)),
          Effect.provide(_.layerInMemory(cache)),
        )

        yield* clientToPopulateCache.get(url)

        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
          Effect.provide(_.layerInMemory(cache)),
        )
        const responseFromFreshCache = yield* client.get(url)

        expect(responseFromFreshCache).toStrictEqual(originalResponse)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
    )
  })

  describe('the cached response is stale', () => {
    test.todo('the cached response is returned immediately')

    describe('cached response can be revalidated', () => {
      describe('able to cache it', () => {
        test.todo('updates the cached value')
      })

      describe('not able to cache it', () => {
        test.todo('ignores the failure')
      })
    })

    describe("cached response can't be revalidated", () => {
      describe('with a timeout', () => {
        test.todo('ignores the failure')
      })

      describe('with a network error', () => {
        test.todo('ignores the failure')
      })

      describe('with a response that does not have a 200 status code', () => {
        test.todo('ignores the failure')
      })
    })
  })
})

describe('getting from the cache is too slow', () => {
  test.failing.prop([fc.url(), fc.statusCode().filter(status => status >= StatusCodes.OK), fc.durationInput()])(
    'makes the real request',
    (url, status, timeToStale) =>
      Effect.gen(function* () {
        const response = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response(null, { status }))
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
          Effect.provideService(_.HttpCache, {
            get: () => pipe(Effect.fail(new Cause.NoSuchElementException()), Effect.delay('2 seconds')),
            set: () => Effect.void,
            delete: shouldNotBeCalled,
          }),
        )
        const fiber = yield* pipe(client.get(url), Effect.fork)
        yield* TestClock.adjust('1 seconds')
        const actualResponse = yield* Fiber.join(fiber)

        expect(actualResponse).toStrictEqual(response)
      }).pipe(effectTestBoilerplate, Effect.runPromise),
  )
})

describe('with a non-GET request', () => {
  test.failing.prop([
    fc.requestMethod().filter(method => method !== 'GET'),
    fc.url(),
    fc.statusCode().filter(status => status >= StatusCodes.OK),
    fc.durationInput(),
  ])('does not interact with cache', (method, url, status, timeToStale) =>
    Effect.gen(function* () {
      const response = HttpClientResponse.fromWeb(HttpClientRequest.make(method)(url), new Response(null, { status }))
      const client = yield* pipe(
        _.CachingHttpClient(timeToStale),
        Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
        Effect.provideService(_.HttpCache, {
          get: shouldNotBeCalled,
          set: shouldNotBeCalled,
          delete: shouldNotBeCalled,
        }),
      )
      const actualResponse = yield* client.get(url)

      expect(actualResponse).toStrictEqual(response)
    }).pipe(effectTestBoilerplate, Effect.runPromise),
  )
})
