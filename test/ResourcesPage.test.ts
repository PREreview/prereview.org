import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../src/Context.ts'
import { GetPageFromGhost, PageIsUnavailable } from '../src/GhostPage/index.ts'
import * as _ from '../src/ResourcesPage.ts'
import * as Routes from '../src/routes.ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'

describe('ResourcesPage', () => {
  test.prop([fc.supportedLocale(), fc.ghostPage()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const getPageFromGhost = jest.fn<typeof GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.ResourcesPage.pipe(Effect.provideService(GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.Resources,
        current: 'resources',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('Resources')
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('when the page cannot be loaded', locale =>
    Effect.gen(function* () {
      const actual = yield* _.ResourcesPage.pipe(Effect.provideService(GetPageFromGhost, () => new PageIsUnavailable()))

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
