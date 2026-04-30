import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { Locale } from '../../src/Context.ts'
import { GhostPage } from '../../src/ExternalInteractions/index.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/ClubsPage.ts'
import * as fc from '../fc.ts'

describe('ClubsPage', () => {
  it.effect.prop('when the page can be loaded', [fc.supportedLocale(), fc.ghostPage()], ([locale, page]) =>
    Effect.gen(function* () {
      const getPageFromGhost = vi.fn<typeof GhostPage.GetPageFromGhost.Service>(_ => Effect.succeed(page))

      const actual = yield* _.ClubsPage.pipe(Effect.provideService(GhostPage.GetPageFromGhost, getPageFromGhost))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.Clubs,
        current: 'clubs',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPageFromGhost).toHaveBeenCalledWith('Clubs')
    }).pipe(Effect.provideService(Locale, locale)),
  )

  it.effect.prop('when the page cannot be loaded', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.ClubsPage.pipe(
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
    }).pipe(Effect.provideService(Locale, locale)),
  )
})
