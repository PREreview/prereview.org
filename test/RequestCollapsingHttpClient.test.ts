import { HttpClient, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { type Duration, Effect, Exit, Fiber, pipe, TestClock } from 'effect'
import * as _ from '../src/RequestCollapsingHttpClient.ts'
import * as EffectTest from './EffectTest.ts'

describe('requestCollapsingHttpClient', () => {
  test('when the requests are sent in parallel', () =>
    Effect.gen(function* () {
      let responseCount = 0

      const client = yield* pipe(
        _.requestCollapsingHttpClient,
        Effect.provideService(
          HttpClient.HttpClient,
          stubbedClient(() => {
            responseCount++
            return new Response(`response ${responseCount}`)
          }, '30 seconds'),
        ),
      )

      const response1 = yield* Effect.fork(Effect.andThen(client.get('http://example.com'), response => response.text))
      yield* TestClock.adjust('1 second')
      const response2 = yield* Effect.fork(Effect.andThen(client.get('http://example.com'), response => response.text))

      yield* TestClock.adjust('30 seconds')

      const actual = yield* Fiber.join(Fiber.zip(response1, response2))

      expect(responseCount).toBe(1)
      expect(actual).toStrictEqual(['response 1', 'response 1'])
    }).pipe(EffectTest.run))

  test('when the first request is interrupted', () =>
    Effect.gen(function* () {
      const client = yield* pipe(
        _.requestCollapsingHttpClient,
        Effect.provideService(
          HttpClient.HttpClient,
          stubbedClient(() => new Response(), '30 seconds'),
        ),
      )

      const response1 = yield* Effect.fork(client.get('http://example.com'))
      yield* TestClock.adjust('1 second')
      const response2 = yield* Effect.fork(client.get('http://example.com'))

      yield* Fiber.interruptFork(response1)
      yield* TestClock.adjust('30 seconds')

      const actual = yield* Effect.exit(Fiber.join(Fiber.zip(response1, response2)))

      expect(Exit.isInterrupted(actual)).toBeTruthy()

      const cause = yield* Exit.causeOption(actual)

      expect(cause._tag).toStrictEqual('Sequential')
    }).pipe(EffectTest.run))

  test('when the requests are sent in serial', () =>
    Effect.gen(function* () {
      let responseCount = 0

      const client = yield* pipe(
        _.requestCollapsingHttpClient,
        Effect.provideService(
          HttpClient.HttpClient,
          stubbedClient(() => {
            responseCount++
            return new Response(`response ${responseCount}`)
          }, '30 seconds'),
        ),
      )

      const response1 = yield* Effect.fork(Effect.andThen(client.get('http://example.com'), response => response.text))
      yield* TestClock.adjust('30 seconds')
      const response2 = yield* Effect.fork(Effect.andThen(client.get('http://example.com'), response => response.text))

      yield* TestClock.adjust('30 seconds')
      const actual = yield* Fiber.join(Fiber.zip(response1, response2))

      expect(responseCount).toBe(2)
      expect(actual).toStrictEqual(['response 1', 'response 2'])
    }).pipe(EffectTest.run))

  test('when the requests are different', () =>
    Effect.gen(function* () {
      let responseCount = 0

      const client = yield* pipe(
        _.requestCollapsingHttpClient,
        Effect.provideService(
          HttpClient.HttpClient,
          stubbedClient(() => {
            responseCount++
            return new Response(`response ${responseCount}`)
          }, '30 seconds'),
        ),
      )

      const response1 = yield* Effect.fork(Effect.andThen(client.get('http://example.com'), response => response.text))
      yield* TestClock.adjust('1 second')
      const response2 = yield* Effect.fork(
        Effect.andThen(client.get('http://not-example.com/'), response => response.text),
      )

      yield* TestClock.adjust('30 seconds')
      const actual = yield* Fiber.join(Fiber.zip(response1, response2))

      expect(responseCount).toBe(2)
      expect(actual).toStrictEqual(['response 1', 'response 2'])
    }).pipe(EffectTest.run))
})

const stubbedClient = (response: () => Response, responseDelay: Duration.DurationInput = 0): HttpClient.HttpClient =>
  HttpClient.makeWith<never, never, never, never>(
    Effect.andThen(request =>
      Effect.delay(
        Effect.sync(() => HttpClientResponse.fromWeb(request, response())),
        responseDelay,
      ),
    ),
    Effect.succeed,
  )
