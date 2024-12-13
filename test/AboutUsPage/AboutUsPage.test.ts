import { FetchHttpClient } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, pipe, TestContext } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import { Status } from 'hyper-ts'
import * as _ from '../../src/AboutUsPage/index.js'
import { DeprecatedSleepEnv, Locale } from '../../src/Context.js'
import { GhostApi } from '../../src/ghost.js'
import { aboutUsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('AboutUsPage', () => {
  test.prop([fc.supportedLocale(), fc.string({ unit: fc.alphanumeric(), minLength: 1 })])(
    'when the page can be loaded',
    (locale, key) =>
      Effect.gen(function* () {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: 'https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14',
            query: { key },
          },
          { body: { pages: [{ html: '<p>Foo<script>bar</script></p>' }] } },
        )

        const actual = yield* pipe(
          _.AboutUsPage,
          Effect.provideService(FetchHttpClient.Fetch, fetch as typeof FetchHttpClient.Fetch.Service),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(aboutUsMatch.formatter, {}),
          current: 'about-us',
          status: Status.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(DeprecatedSleepEnv, { sleep: shouldNotBeCalled }),
        Effect.provideService(GhostApi, { key }),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )

  test.prop([fc.supportedLocale(), fc.string({ unit: fc.alphanumeric(), minLength: 1 }), fc.fetchResponse()])(
    'when the page cannot be loaded',
    async (locale, key, response) =>
      Effect.gen(function* () {
        const fetch = fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://content.prereview.org/ghost/api/content/pages/6154aa157741400e8722bb14?',
            query: { key },
          },
          response,
        )

        const actual = yield* pipe(
          _.AboutUsPage,
          Effect.provideService(FetchHttpClient.Fetch, fetch as typeof FetchHttpClient.Fetch.Service),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(fetch.done()).toBeTruthy()
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(DeprecatedSleepEnv, { sleep: shouldNotBeCalled }),
        Effect.provideService(GhostApi, { key }),
        Effect.provide(TestContext.TestContext),
        Effect.runPromise,
      ),
  )
})
