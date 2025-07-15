import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import * as _ from '../src/ClubsPage.js'
import { Locale } from '../src/Context.js'
import { GetPageFromGhost, PageIsUnavailable } from '../src/GhostPage/index.js'
import * as Routes from '../src/routes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('ClubsPage', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const getPageFromGhost = jest.fn<typeof GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.ClubsPage.pipe(Effect.provideService(GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.Clubs,
        current: 'clubs',
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('Clubs')
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('when the page cannot be loaded', locale =>
    Effect.gen(function* () {
      const actual = yield* _.ClubsPage.pipe(Effect.provideService(GetPageFromGhost, () => new PageIsUnavailable()))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )
})
