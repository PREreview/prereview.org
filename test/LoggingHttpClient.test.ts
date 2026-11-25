import { Duration, Effect, Fiber, Logger, References } from 'effect'
import { HttpClient, type HttpClientError, type HttpClientResponse } from 'effect/http'
import { TestClock } from 'effect/testing'
import * as _ from '../src/LoggingHttpClient.ts'
import * as fc from './fc.ts'
import { describe, expect, it } from './vitest.ts'

const stubbedClient = (
  response: HttpClientResponse.HttpClientResponse,
  responseDuration: Duration.Input,
): HttpClient.HttpClient =>
  HttpClient.makeWith<never, never, HttpClientError.HttpClientError, never>(
    () => Effect.succeed(response).pipe(Effect.delay(responseDuration)),
    Effect.succeed,
  )

const stubbedFailingClient = (
  error: HttpClientError.HttpClientError,
  failureDuration: Duration.Input,
): HttpClient.HttpClient =>
  HttpClient.makeWith<never, never, HttpClientError.HttpClientError, never>(
    () => Effect.fail(error).pipe(Effect.delay(failureDuration)),
    Effect.succeed,
  )

describe('when a response is received', () => {
  it.effect.prop(
    'logs how long it took',
    [fc.httpClientResponse(), fc.integer({ min: 0, max: 10_000 })],
    ([response, durationMs]) =>
      Effect.gen(function* () {
        const logs: Array<{ message: unknown; annotations: Readonly<Record<string, unknown>> }> = []
        const capturingLogger = Logger.make(({ message, fiber }) => {
          logs.push({ message, annotations: fiber.getRef(References.CurrentLogAnnotations) })
        })

        const client = yield* Effect.provideService(
          _.loggingHttpClient,
          HttpClient.HttpClient,
          stubbedClient(response, Duration.millis(durationMs)),
        )

        const fiber = yield* client
          .execute(response.request)
          .pipe(Effect.provide(Logger.layer([capturingLogger])), Effect.forkChild)
        yield* TestClock.adjust(Duration.millis(durationMs))
        yield* Fiber.join(fiber)

        expect(logs).toContainEqual({
          message: ['Received HTTP response'],
          annotations: expect.objectContaining({ url: response.request.url, durationMs }),
        })
      }).pipe(Effect.provideService(References.MinimumLogLevel, 'Debug')),
  )
})

describe('when the request fails', () => {
  it.effect.prop(
    'logs how long it took',
    [fc.httpClientRequestError(), fc.integer({ min: 0, max: 10_000 })],
    ([error, durationMs]) =>
      Effect.gen(function* () {
        const logs: Array<{ message: unknown; annotations: Readonly<Record<string, unknown>> }> = []
        const capturingLogger = Logger.make(({ message, fiber }) => {
          logs.push({ message, annotations: fiber.getRef(References.CurrentLogAnnotations) })
        })

        const client = yield* Effect.provideService(
          _.loggingHttpClient,
          HttpClient.HttpClient,
          stubbedFailingClient(error, Duration.millis(durationMs)),
        )

        const fiber = yield* client
          .execute(error.request)
          .pipe(Effect.provide(Logger.layer([capturingLogger])), Effect.exit, Effect.forkChild)
        yield* TestClock.adjust(Duration.millis(durationMs))
        yield* Fiber.join(fiber)

        expect(logs).toContainEqual({
          message: ['Error sending HTTP request'],
          annotations: expect.objectContaining({ url: error.request.url, durationMs }),
        })
      }),
  )
})
