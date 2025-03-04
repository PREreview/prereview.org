import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import * as _ from '../../src/AboutUsPage/index.js'
import { Locale } from '../../src/Context.js'
import { GetPageFromGhost, PageIsNotFound, PageIsUnavailable } from '../../src/GhostPage.js'
import * as Routes from '../../src/routes.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('AboutUsPage', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', (locale, html) =>
    Effect.gen(function* () {
      const actual = yield* _.AboutUsPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.AboutUs,
        current: 'about-us',
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(GetPageFromGhost, () => Effect.succeed(html)),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale(), fc.constantFrom(new PageIsUnavailable(), new PageIsNotFound())])(
    'when the page cannot be loaded',
    async (locale, error) =>
      Effect.gen(function* () {
        const actual = yield* _.AboutUsPage

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: Status.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provideService(Locale, locale),
        Effect.provideService(GetPageFromGhost, () => Effect.fail(error)),
        EffectTest.run,
      ),
  )
})
