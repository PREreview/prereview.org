import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { Locale } from '../src/Context.js'
import * as _ from '../src/EdiaStatementPage.js'
import { GetPageFromGhost, PageIsUnavailable } from '../src/GhostPage/index.js'
import * as Routes from '../src/routes.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('EdiaStatementPage', () => {
  test.prop([fc.supportedLocale(), fc.ghostPage()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const getPageFromGhost = jest.fn<typeof GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.EdiaStatementPage.pipe(Effect.provideService(GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.EdiaStatement,
        current: 'edia-statement',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('EdiaStatement')
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.supportedLocale()])('when the page cannot be loaded', locale =>
    Effect.gen(function* () {
      const actual = yield* _.EdiaStatementPage.pipe(
        Effect.provideService(GetPageFromGhost, () => new PageIsUnavailable()),
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
