import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.ts'
import { GhostPage } from '../../src/ExternalInteractions/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/LiveReviewsPage.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('LiveReviewsPage', () => {
  test.prop([fc.supportedLocale(), fc.ghostPage()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const getPageFromGhost = jest.fn<typeof GhostPage.GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.LiveReviewsPage.pipe(Effect.provideService(GhostPage.GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.LiveReviews,
        current: 'live-reviews',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('LiveReviews')
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('when the page cannot be loaded', locale =>
    Effect.gen(function* () {
      const actual = yield* _.LiveReviewsPage.pipe(
        Effect.provideService(GhostPage.GetPageFromGhost, () => new GhostPage.PageIsUnavailable()),
      )

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
