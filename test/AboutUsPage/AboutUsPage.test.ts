import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import * as _ from '../../src/AboutUsPage/index.ts'
import { Locale } from '../../src/Context.ts'
import { GetPageFromGhost, PageIsUnavailable } from '../../src/GhostPage/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('AboutUsPage', () => {
  test.prop([fc.supportedLocale(), fc.ghostPage()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const actual = yield* _.AboutUsPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.AboutUs,
        current: 'about-us',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(GetPageFromGhost, () => Effect.succeed(page)),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale()])('when the page cannot be loaded', async locale =>
    Effect.gen(function* () {
      const actual = yield* _.AboutUsPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(GetPageFromGhost, () => new PageIsUnavailable()),
      EffectTest.run,
    ),
  )
})
