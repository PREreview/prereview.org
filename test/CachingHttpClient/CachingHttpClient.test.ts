import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { beforeEach, describe, expect } from '@jest/globals'
import { Duration, Effect, Either, Fiber, Layer, pipe, Queue, TestClock } from 'effect'
import * as _ from '../../src/CachingHttpClient/index.ts'
import { InternalHttpCacheFailure } from '../../src/CachingHttpClient/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

const stubbedClient = (
  response: HttpClientResponse.HttpClientResponse,
  responseDuration: Duration.DurationInput = 0,
): HttpClient.HttpClient.With<never> =>
  HttpClient.makeWith(() => Effect.succeed(response).pipe(Effect.delay(responseDuration)), Effect.succeed)

const stubbedFailingClient = (
  error: HttpClientError.HttpClientError,
): HttpClient.HttpClient.With<HttpClientError.HttpClientError> =>
  HttpClient.makeWith(() => Effect.fail(error), Effect.succeed)

const shouldNotBeCalledHttpClient: HttpClient.HttpClient.With<HttpClientError.HttpClientError> = HttpClient.makeWith(
  () => {
    throw new Error('should not make any http requests with HttpClient')
  },
  Effect.succeed,
)

const emptyQueue = Layer.effect(_.RevalidationQueue, Queue.bounded(0))

describe('there is no cache entry', () => {
  describe('the request succeeds', () => {
    test.prop([
      fc.httpClientResponse({
        request: fc.httpClientRequest({ method: fc.constant('GET') }),
        status: fc.constant(StatusCodes.OK),
      }),
      fc.durationInput(),
    ])('able to cache it', (response, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
          Effect.provide(_.layerInMemory(cache)),
        )

        const actualResponse = yield* client.execute(response.request)
        expect(actualResponse).toStrictEqual(response)
        expect(cache.size).toBe(1)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run),
    )

    test.prop([fc.httpClientResponse(), fc.error(), fc.durationInput()])(
      'not able to cache it',
      (response, error, timeToStale) =>
        Effect.gen(function* () {
          const client = yield* pipe(
            _.CachingHttpClient(timeToStale),
            Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
            Effect.provideService(_.HttpCache, {
              get: () => new _.NoCachedResponseFound({}),
              set: () => new InternalHttpCacheFailure({ cause: error }),
              delete: () => Effect.void,
            }),
          )
          const actualResponse = yield* client.execute(response.request)
          expect(actualResponse).toStrictEqual(response)
        }).pipe(Effect.provide(emptyQueue), EffectTest.run),
    )
  })

  describe('the request fails', () => {
    test.prop([
      fc.httpClientResponse({ request: fc.httpClientRequest({ method: fc.constant('GET') }) }),
      fc.durationInput(),
    ])('with a timeout', (response, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(response, '3 seconds')),
          Effect.provide(_.layerInMemory(cache)),
        )

        const fiber = yield* pipe(client.execute(response.request), Effect.either, Effect.fork)
        yield* TestClock.adjust('3 seconds')
        const actualResponse = yield* Fiber.join(fiber)

        expect(actualResponse).toStrictEqual(Either.left(expect.objectContaining({ _tag: 'RequestError' })))
        expect(cache.size).toBe(0)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run),
    )

    test.prop([
      fc.httpClientRequest({ method: fc.constant('GET') }),
      fc.durationInput(),
      fc.httpClientRequestError({ reason: fc.constant('Transport') }),
    ])('with a network error', (request, timeToStale, error) =>
      Effect.gen(function* () {
        const cache = new Map()
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedFailingClient(error)),
          Effect.provide(_.layerInMemory(cache)),
        )

        const actualResponse = yield* Effect.either(client.execute(request))

        expect(actualResponse).toStrictEqual(Either.left(error))
        expect(cache.size).toBe(0)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run),
    )

    test.prop([
      fc.httpClientResponse({ status: fc.statusCode().filter(status => status !== StatusCodes.OK) }),
      fc.durationInput(),
    ])('with a response that does not have a 200 status code', (response, timeToStale) =>
      Effect.gen(function* () {
        const cache = new Map()
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
          Effect.provide(_.layerInMemory(cache)),
        )

        const actualResponse = yield* client.execute(response.request)

        expect(actualResponse).toStrictEqual(response)
        expect(cache.size).toBe(0)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run),
    )
  })
})

describe('there is a cache entry', () => {
  const timeToStale = '10 seconds'
  const url = new URL('https://example.com')
  const originalResponse = HttpClientResponse.fromWeb(
    HttpClientRequest.get(url),
    new Response('original response body', { headers: [['foo', 'bar']] }),
  )
  const newResponse = HttpClientResponse.fromWeb(
    HttpClientRequest.get(url),
    new Response('new response body', { headers: [['foo', 'bar']] }),
  )

  let cache: Map<string, _.CacheValue>

  beforeEach(() =>
    Effect.gen(function* () {
      cache = new Map()
      const clientToPopulateCache = yield* pipe(
        _.CachingHttpClient(timeToStale),
        Effect.provideService(HttpClient.HttpClient, stubbedClient(originalResponse)),
        Effect.provide(_.layerInMemory(cache)),
      )
      yield* clientToPopulateCache.get(url)
    }).pipe(Effect.provide(emptyQueue), EffectTest.run),
  )

  describe('the cached response is fresh', () => {
    test('the cached response is returned without making any requests', () =>
      Effect.gen(function* () {
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
          Effect.provide(_.layerInMemory(cache)),
        )
        const responseFromFreshCache = yield* client.get(url)

        expect(responseFromFreshCache.status).toStrictEqual(originalResponse.status)
        expect(responseFromFreshCache.headers).toStrictEqual(originalResponse.headers)
        expect(yield* responseFromFreshCache.text).toStrictEqual(yield* originalResponse.text)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run))
  })

  describe('the cached response is stale', () => {
    test.prop([fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) })])(
      'the cached response is returned immediately',
      request =>
        Effect.gen(function* () {
          const client = yield* pipe(
            _.CachingHttpClient(timeToStale),
            Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
            Effect.provide(_.layerInMemory(cache)),
          )

          yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
          const responseFromStaleCache = yield* client.execute(request)

          expect(responseFromStaleCache.status).toStrictEqual(originalResponse.status)
          expect(responseFromStaleCache.headers).toStrictEqual(originalResponse.headers)
          expect(yield* responseFromStaleCache.text).toStrictEqual(yield* originalResponse.text)
        }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
    )

    describe('cached response can be revalidated', () => {
      describe('able to cache it', () => {
        test.prop([fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) })])(
          'updates the cached value',
          request =>
            Effect.gen(function* () {
              yield* pipe(
                Layer.launch(_.layerRevalidationWorker),
                Effect.provideService(HttpClient.HttpClient, stubbedClient(newResponse)),
                Effect.provide(_.layerInMemory(cache)),
                Effect.fork,
              )

              const client = yield* pipe(
                _.CachingHttpClient(timeToStale),
                Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
                Effect.provide(_.layerInMemory(cache)),
              )

              yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
              yield* client.execute(request)
              yield* TestClock.adjust('1 seconds')
              const responseFromCacheFollowingServingOfStaleEntry = yield* client.execute(request)

              expect(responseFromCacheFollowingServingOfStaleEntry.status).toStrictEqual(newResponse.status)
              expect(responseFromCacheFollowingServingOfStaleEntry.headers).toStrictEqual(newResponse.headers)
              expect(yield* responseFromCacheFollowingServingOfStaleEntry.text).toStrictEqual(yield* newResponse.text)
            }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })

      describe('not able to cache it', () => {
        test.prop([fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) })])(
          'ignores the failure',
          request =>
            Effect.gen(function* () {
              cache.set = () => {
                throw new Error('failed to set cache value')
              }

              yield* pipe(
                Layer.launch(_.layerRevalidationWorker),
                Effect.provideService(HttpClient.HttpClient, stubbedClient(newResponse)),
                Effect.provide(_.layerInMemory(cache)),
                Effect.fork,
              )

              const client = yield* pipe(
                _.CachingHttpClient(timeToStale),
                Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
                Effect.provide(_.layerInMemory(cache)),
              )

              yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
              const responseFromStaleCache = yield* client.execute(request).pipe(Effect.either)
              yield* TestClock.adjust('1 seconds')
              const responseFromCacheFollowingServingOfStaleEntry = yield* client.execute(request)

              expect(responseFromStaleCache).toStrictEqual(Either.right(expect.anything()))
              expect(yield* responseFromCacheFollowingServingOfStaleEntry.text).toStrictEqual(
                yield* originalResponse.text,
              )
            }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })
    })

    describe('cached response needs to be deleted', () => {
      describe('able to delete it', () => {
        test.prop([
          fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) }),
          fc.constantFrom(StatusCodes.NotFound, StatusCodes.Gone),
          fc.httpClientResponse(),
        ])('deletes the cached value', (request, status, expectedResponse) =>
          Effect.gen(function* () {
            const newResponse = HttpClientResponse.fromWeb(
              HttpClientRequest.get(url),
              new Response('new response body', { headers: [['foo', 'bar']], status }),
            )

            yield* pipe(
              Layer.launch(_.layerRevalidationWorker),
              Effect.provideService(HttpClient.HttpClient, stubbedClient(newResponse)),
              Effect.provide(_.layerInMemory(cache)),
              Effect.fork,
            )

            const client = yield* pipe(
              _.CachingHttpClient(timeToStale),
              Effect.provideService(HttpClient.HttpClient, stubbedClient(expectedResponse)),
              Effect.provide(_.layerInMemory(cache)),
            )

            yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
            yield* client.execute(request)
            yield* TestClock.adjust('1 seconds')

            const responseFromCacheFollowingServingOfStaleEntry = yield* client.execute(request)

            expect(responseFromCacheFollowingServingOfStaleEntry).toStrictEqual(expectedResponse)
          }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })

      describe('not able to delete it', () => {
        test.prop([
          fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) }),
          fc.constantFrom(StatusCodes.NotFound, StatusCodes.Gone),
        ])('ignores the failure', (request, status) =>
          Effect.gen(function* () {
            const newResponse = HttpClientResponse.fromWeb(
              HttpClientRequest.get(url),
              new Response('new response body', { headers: [['foo', 'bar']], status }),
            )

            cache.delete = () => {
              throw new Error('failed to delete cache value')
            }

            yield* pipe(
              Layer.launch(_.layerRevalidationWorker),
              Effect.provideService(HttpClient.HttpClient, stubbedClient(newResponse)),
              Effect.provide(_.layerInMemory(cache)),
              Effect.fork,
            )

            const client = yield* pipe(
              _.CachingHttpClient(timeToStale),
              Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
              Effect.provide(_.layerInMemory(cache)),
            )

            yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
            const responseFromStaleCache = yield* client.execute(request).pipe(Effect.either)
            yield* TestClock.adjust('1 seconds')
            const responseFromCacheFollowingServingOfStaleEntry = yield* client.execute(request)

            expect(responseFromStaleCache).toStrictEqual(Either.right(expect.anything()))
            expect(yield* responseFromCacheFollowingServingOfStaleEntry.text).toStrictEqual(
              yield* originalResponse.text,
            )
          }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })
    })

    describe("cached response can't be revalidated", () => {
      describe('when no response is received', () => {
        test.prop([fc.httpClientRequestError({ reason: fc.constant('Transport') })])('ignores the failure', error =>
          Effect.gen(function* () {
            yield* pipe(
              Layer.launch(_.layerRevalidationWorker),
              Effect.provideService(HttpClient.HttpClient, stubbedFailingClient(error)),
              Effect.provide(_.layerInMemory(cache)),
              Effect.fork,
            )

            const client = yield* pipe(
              _.CachingHttpClient(timeToStale),
              Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
              Effect.provide(_.layerInMemory(cache)),
            )

            yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
            const responseFromStaleCache = yield* client.get(url).pipe(Effect.either)
            yield* TestClock.adjust('1 seconds')
            const responseFromCacheFollowingServingOfStaleEntry = yield* client.get(url)

            expect(responseFromStaleCache).toStrictEqual(Either.right(expect.anything()))
            expect(yield* responseFromCacheFollowingServingOfStaleEntry.text).toStrictEqual(
              yield* originalResponse.text,
            )
          }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })

      describe('with a response that does not have an expected status code', () => {
        test.prop([
          fc.httpClientResponse({
            request: fc.httpClientRequest({ method: fc.constant('GET'), url: fc.constant(url) }),
            status: fc
              .statusCode()
              .filter(status => ![StatusCodes.OK, StatusCodes.NotFound, StatusCodes.Gone].includes(status as number)),
          }),
        ])('ignores the failure', response =>
          Effect.gen(function* () {
            yield* pipe(
              Layer.launch(_.layerRevalidationWorker),
              Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
              Effect.provide(_.layerInMemory(cache)),
              Effect.fork,
            )

            const client = yield* pipe(
              _.CachingHttpClient(timeToStale),
              Effect.provideService(HttpClient.HttpClient, shouldNotBeCalledHttpClient),
              Effect.provide(_.layerInMemory(cache)),
            )

            yield* TestClock.adjust(Duration.sum(timeToStale, '2 seconds'))
            const responseFromStaleCache = yield* client.get(url).pipe(Effect.either)
            yield* TestClock.adjust('1 seconds')
            const responseFromCacheFollowingServingOfStaleEntry = yield* client.execute(response.request)

            expect(responseFromStaleCache).toStrictEqual(Either.right(expect.anything()))
            expect(yield* responseFromCacheFollowingServingOfStaleEntry.text).toStrictEqual(
              yield* originalResponse.text,
            )
          }).pipe(Effect.provide(_.layerRevalidationQueue), EffectTest.run),
        )
      })
    })
  })
})

describe('getting from the cache is too slow', () => {
  test.prop([fc.httpClientResponse(), fc.durationInput(), fc.durationInput()])(
    'makes the real request',
    (response, timeToStale, delay) =>
      Effect.gen(function* () {
        const client = yield* pipe(
          _.CachingHttpClient(timeToStale),
          Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
          Effect.provide(
            Layer.mock(_.HttpCache, {
              get: () => pipe(Effect.sync(shouldNotBeCalled), Effect.delay(Duration.sum(_.CacheTimeout, delay))),
              set: () => Effect.void,
            }),
          ),
        )
        const fiber = yield* pipe(client.execute(response.request), Effect.fork)
        yield* TestClock.adjust(_.CacheTimeout)
        const actualResponse = yield* Fiber.join(fiber)

        expect(actualResponse).toStrictEqual(response)
      }).pipe(Effect.provide(emptyQueue), EffectTest.run),
  )
})

describe('with a non-GET request', () => {
  test.prop([
    fc.httpClientResponse({
      request: fc.httpClientRequest({ method: fc.requestMethod().filter(method => method !== 'GET') }),
    }),
    fc.statusCode(),
    fc.durationInput(),
  ])('does not interact with cache', (response, timeToStale) =>
    Effect.gen(function* () {
      const client = yield* pipe(
        _.CachingHttpClient(timeToStale),
        Effect.provideService(HttpClient.HttpClient, stubbedClient(response)),
        Effect.provide(Layer.mock(_.HttpCache, {})),
      )
      const actualResponse = yield* client.execute(response.request)

      expect(actualResponse).toStrictEqual(response)
    }).pipe(Effect.provide(emptyQueue), EffectTest.run),
  )
})
