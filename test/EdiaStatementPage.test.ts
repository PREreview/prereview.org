import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Effect } from 'effect'
import { Status } from 'hyper-ts'
import { Locale } from '../src/Context.js'
import * as _ from '../src/EdiaStatementPage.js'
import { GetPageFromGhost, PageIsNotFound, PageIsUnavailable } from '../src/GhostPage/index.js'
import * as Routes from '../src/routes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('EdiaStatementPage', () => {
  test.prop([fc.supportedLocale(), fc.html()])('when the page can be loaded', (locale, page) =>
    Effect.gen(function* () {
      const getPageFromGhost = jest.fn<typeof GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.EdiaStatementPage.pipe(Effect.provideService(GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.EdiaStatement,
        current: 'edia-statement',
        status: Status.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('6154aa157741400e8722bb17')
    }).pipe(Effect.provideService(Locale, locale), EffectTest.run),
  )

  test.prop([fc.supportedLocale(), fc.constantFrom(new PageIsUnavailable(), new PageIsNotFound())])(
    'when the page cannot be loaded',
    (locale, error) =>
      Effect.gen(function* () {
        const actual = yield* _.EdiaStatementPage.pipe(Effect.provideService(GetPageFromGhost, () => error))

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
