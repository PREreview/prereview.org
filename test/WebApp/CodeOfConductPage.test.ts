import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { CmsContent } from '../../src/CmsContent/index.ts'
import { Locale } from '../../src/Context.ts'
import { UnableToQuery } from '../../src/Queries.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/CodeOfConductPage.ts'
import * as fc from '../fc.ts'

describe('CodeOfConductPage', () => {
  it.effect.prop('when the page can be loaded', [fc.supportedLocale(), fc.cmsPage()], ([locale, page]) =>
    Effect.gen(function* () {
      const getPage = vi.fn<(typeof CmsContent.Service)['getPage']>(_ => Effect.succeed(page))

      const actual = yield* _.CodeOfConductPage.pipe(Effect.provide(Layer.mock(CmsContent, { getPage })))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.CodeOfConduct,
        current: 'code-of-conduct',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getPage).toHaveBeenCalledWith('CodeOfConduct')
    }).pipe(Effect.provideService(Locale, locale)),
  )

  it.effect.prop('when the page cannot be loaded', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* _.CodeOfConductPage.pipe(
        Effect.provide(Layer.mock(CmsContent, { getPage: () => new UnableToQuery({}) })),
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
