import { HttpClient, HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { type Duration, Effect, Either, Fiber, Option, pipe, TestClock, TestContext } from 'effect'
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
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
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
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
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
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
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
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
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
        }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
    )
  })
})

describe('there is a cache entry', () => {
  describe('the cached response is fresh', () => {
    test.todo('the cached response is returned')
  })

  describe('the cached response is stale', () => {
    test.todo('the cached response is returned')

    describe('cached response can be revalidated', () => {
      test.todo('able to cache it')

      test.todo('not able to cache it')
    })

    describe("cached response can't be revalidated", () => {
      test.todo('with a timeout')

      test.todo('with a network error')

      test.todo('with a response that does not have a 200 status code')
    })
  })
})

describe('the cache is too slow', () => {
  test.todo('makes the real request')
})

describe('with a non-GET request', () => {
  test.failing.prop([fc.url(), fc.statusCode().filter(status => status >= StatusCodes.OK), fc.durationInput()])(
    'does not interact with cache',
    (url, status, timeToStale) =>
      Effect.gen(function* () {
        const response = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response(null, { status }))
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
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
  )
})
