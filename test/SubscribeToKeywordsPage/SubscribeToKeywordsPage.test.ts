import { UrlParams } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Option } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/SubscribeToKeywordsPage/index.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

test.prop([fc.supportedLocale()])('SubscribeToKeywordsPage', locale =>
  Effect.gen(function* () {
    const actual = yield* _.SubscribeToKeywordsPage

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: Routes.SubscribeToKeywords,
      status: StatusCodes.OK,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: [],
    })
  }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
)

describe('SubscribeToKeywordsSubmission', () => {
  test.prop([fc.urlParams(fc.record({ search: fc.nonEmptyString() })), fc.supportedLocale()])(
    'with a search',
    (body, locale) =>
      Effect.gen(function* () {
        const actual = yield* _.SubscribeToKeywordsSubmission({ body })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.SubscribeToKeywords,
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: [],
        })
      }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([
    fc.urlParams().filter(urlParams => Option.isNone(UrlParams.getFirst(urlParams, 'search'))),
    fc.supportedLocale(),
  ])('without a search', (body, locale) =>
    Effect.gen(function* () {
      const actual = yield* _.SubscribeToKeywordsSubmission({ body })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )
})
