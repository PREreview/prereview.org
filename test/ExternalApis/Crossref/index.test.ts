import { HttpClient, HttpClientResponse } from 'effect/http'
import { RateLimiter } from 'effect/persistence'
import { describe, expect, it } from '../../vitest.ts'
import { Effect, Fiber, Layer, pipe } from 'effect'
import { TestClock } from 'effect/testing'
import * as _ from '../../../src/ExternalApis/Crossref/index.ts'

describe('layerRateLimitedHttpClient', () => {
  it.effect('when rate limited, it tries again', () =>
    Effect.gen(function* () {
      const statuses = [429, 200]
      let requests = 0

      const fiber = yield* pipe(
        HttpClient.get('https://api.crossref.org/works/10.1101%2F2023.02.28.529746'),
        Effect.provide(
          stubbedLayer(request =>
            Effect.sync(() => {
              requests++
              return HttpClientResponse.fromWeb(request, new Response(null, { status: statuses.shift() ?? 500 }))
            }),
          ),
        ),
        Effect.forkChild,
      )
      yield* TestClock.adjust('1 minute')
      const actual = yield* Fiber.join(fiber)

      expect(actual.status).toStrictEqual(200)
      expect(requests).toBe(2)
    }),
  )

  it.effect('when always rate limited, it gives up', () =>
    Effect.gen(function* () {
      let requests = 0

      const fiber = yield* pipe(
        HttpClient.get('https://api.crossref.org/works/10.1101%2F2023.02.28.529746'),
        Effect.provide(
          stubbedLayer(request =>
            Effect.sync(() => {
              requests++
              return HttpClientResponse.fromWeb(request, new Response(null, { status: 429 }))
            }),
          ),
        ),
        Effect.forkChild,
      )
      yield* TestClock.adjust('1 minute')
      const actual = yield* Fiber.join(fiber)

      expect(actual.status).toStrictEqual(429)
      expect(requests).toBe(4)
    }),
  )

  it.effect('sends at most three requests at once', () =>
    Effect.gen(function* () {
      let inFlight = 0
      let maxInFlight = 0

      const fiber = yield* pipe(
        Effect.forEach(
          Array.from({ length: 6 }, (_, i) => i),
          i => HttpClient.get(`https://api.crossref.org/works/10.1101%2F${i}`),
          { concurrency: 'unbounded' },
        ),
        Effect.provide(
          stubbedLayer(request =>
            pipe(
              Effect.sync(() => {
                inFlight++
                maxInFlight = Math.max(maxInFlight, inFlight)
              }),
              Effect.andThen(Effect.sleep('1 second')),
              Effect.andThen(
                Effect.sync(() => {
                  inFlight--
                  return HttpClientResponse.fromWeb(request, new Response())
                }),
              ),
            ),
          ),
        ),
        Effect.forkChild,
      )
      yield* TestClock.adjust('1 minute')
      const actual = yield* Fiber.join(fiber)

      expect(actual).toHaveLength(6)
      expect(maxInFlight).toBe(3)
    }),
  )
})

const stubbedLayer = (
  respond: (
    request: Parameters<typeof HttpClientResponse.fromWeb>[0],
  ) => Effect.Effect<HttpClientResponse.HttpClientResponse>,
) =>
  pipe(
    _.layerRateLimitedHttpClient,
    Layer.provide([
      Layer.succeed(HttpClient.HttpClient, HttpClient.make(respond)),
      Layer.provide(RateLimiter.layer, RateLimiter.layerStoreMemory),
    ]),
  )
