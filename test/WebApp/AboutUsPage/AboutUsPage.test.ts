import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../../src/Context.ts'
import { GhostPage } from '../../../src/ExternalInteractions/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/AboutUsPage/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

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
      Effect.provideService(GhostPage.GetPageFromGhost, () => Effect.succeed(page)),
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
      Effect.provideService(GhostPage.GetPageFromGhost, () => new GhostPage.PageIsUnavailable()),
      EffectTest.run,
    ),
  )
})
