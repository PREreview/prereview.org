import { describe, expect, it } from '@effect/vitest'
import { Effect } from 'effect'
import { Locale } from '../../../src/Context.ts'
import { GhostPage } from '../../../src/ExternalInteractions/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/ChampionsProgramPage/index.ts'
import * as fc from '../../fc.ts'

describe('ChampionsProgramPage', () => {
  it.effect.prop('when the page can be loaded', [fc.supportedLocale(), fc.ghostPage()], ([locale, page]) =>
    Effect.gen(function* () {
      const actual = yield* _.ChampionsProgramPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChampionsProgram,
        current: 'champions-program',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provideService(Locale, locale),
      Effect.provideService(GhostPage.GetPageFromGhost, () => Effect.succeed(page)),
    ),
  )

  it.effect.prop('when the page cannot be loaded', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.ChampionsProgramPage

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
    ),
  )
})
