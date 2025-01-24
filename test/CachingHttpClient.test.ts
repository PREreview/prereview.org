import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Option, pipe, TestContext } from 'effect'
import * as _ from '../src/CachingHttpClient/index.js'
import * as HttpCache from '../src/HttpCache.js'
import * as fc from './fc.js'

const stubbedClient = (response: HttpClientResponse.HttpClientResponse): HttpClient.HttpClient.With<never, never> =>
  HttpClient.makeWith(() => Effect.succeed(response), Effect.succeed)

describe('there is no cache entry', () => {
  describe('the request succeeds', () => {
    test.prop([fc.url()])('able to cache it', url =>
      Effect.gen(function* () {
        const cache = new Map()
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient,
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse)),
          Effect.provide(HttpCache.layerInMemory(cache)),
        )

        const actualResponse = yield* client.get(url)
        expect(actualResponse).toStrictEqual(successfulResponse)
        expect(cache.size).toBe(1)
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
    )

    test.prop([fc.url(), fc.error()])('not able to cache it', (url, error) =>
      Effect.gen(function* () {
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient,
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse)),
          Effect.provideService(HttpCache.HttpCache, {
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
    test.todo('with a timeout')

    test.todo('with a network error')

    test.todo('with an unexpected response')
  })
})
