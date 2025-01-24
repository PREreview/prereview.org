import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, pipe, TestContext } from 'effect'
import * as _ from '../src/CachingHttpClient/index.js'
import * as HttpCache from '../src/HttpCache.js'
import * as fc from './fc.js'

const stubbedClient = (response: HttpClientResponse.HttpClientResponse): HttpClient.HttpClient.With<never, never> =>
  HttpClient.makeWith(() => Effect.succeed(response), Effect.succeed)

describe('there is no cache entry', () => {
  describe('the request succeeds', () => {
    test.failing.prop([fc.url()])('able to cache it', url =>
      Effect.gen(function* () {
        const cache = new Map()
        const successfulResponse = HttpClientResponse.fromWeb(HttpClientRequest.get(url), new Response())
        const client = yield* pipe(
          _.CachingHttpClient,
          Effect.provideService(HttpClient.HttpClient, stubbedClient(successfulResponse)),
          Effect.provide(HttpCache.layerInMemory),
        )

        const actualResponse = yield* client.get(url)
        expect(actualResponse).toStrictEqual(successfulResponse)
        expect(cache.size).toBe(1)
      }).pipe(Effect.scoped, Effect.provide(TestContext.TestContext), Effect.runPromise),
    )

    test.todo('not able to cache it')
  })

  describe('the request fails', () => {
    test.todo('with a timeout')

    test.todo('with a network error')

    test.todo('with an unexpected response')
  })
})
