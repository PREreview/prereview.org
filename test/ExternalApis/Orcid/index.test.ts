import { Effect, Fiber, Layer, Option, pipe } from 'effect'
import { HttpClient, HttpClientResponse } from 'effect/http'
import { RateLimiter } from 'effect/persistence'
import { TestClock } from 'effect/testing'
import * as _ from '../../../src/ExternalApis/Orcid/index.ts'
import { describe, expect, it } from '../../vitest.ts'

describe('layerRateLimitedHttpClient', () => {
  it.effect('when always rate limited, it gives up', () =>
    Effect.gen(function* () {
      let requests = 0

      const fiber = yield* pipe(
        HttpClient.get('https://pub.orcid.org/v3.0/0000-0002-1825-0097/personal-details'),
        Effect.provide(
          pipe(
            _.layerRateLimitedHttpClient,
            Layer.provide([
              Layer.succeed(
                HttpClient.HttpClient,
                HttpClient.make(request =>
                  Effect.sync(() => {
                    requests++
                    return HttpClientResponse.fromWeb(request, new Response(null, { status: 429 }))
                  }),
                ),
              ),
              Layer.succeed(_.OrcidApi, { origin: new URL('https://pub.orcid.org/'), token: Option.none() }),
              Layer.provide(RateLimiter.layer, RateLimiter.layerStoreMemory),
            ]),
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
})
