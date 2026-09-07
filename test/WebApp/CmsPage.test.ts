import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Layer, Struct } from 'effect'
import { CmsContent } from '../../src/CmsContent/index.ts'
import { Locale } from '../../src/Context.ts'
import { UnableToQuery } from '../../src/Queries.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/CmsPage.ts'
import * as fc from '../fc.ts'

describe('CmsPage', () => {
  it.effect.prop(
    'when the page can be loaded',
    [
      fc.supportedLocale(),
      fc.cmsPage(),
      fc.cmsPageId(),
      fc.option(fc.string(), { nil: undefined }),
      fc.pageResponse().map(Struct.get('current')),
    ],
    ([locale, page, pageId, canonical, current]) =>
      Effect.gen(function* () {
        const getPage = vi.fn<(typeof CmsContent.Service)['getPage']>(_ => Effect.succeed(page))

        const actual = yield* _.CmsPage({ pageId, canonical, current }).pipe(
          Effect.provide(Layer.mock(CmsContent, { getPage })),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical,
          current,
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(getPage).toHaveBeenCalledWith(pageId)
      }).pipe(Effect.provideService(Locale, locale)),
  )

  it.effect.prop(
    'when the page cannot be loaded',
    [
      fc.supportedLocale(),
      fc.cmsPageId(),
      fc.option(fc.string(), { nil: undefined }),
      fc.pageResponse().map(Struct.get('current')),
    ],
    ([locale, pageId, canonical, current]) =>
      Effect.gen(function* () {
        const actual = yield* _.CmsPage({ pageId, canonical, current }).pipe(
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
