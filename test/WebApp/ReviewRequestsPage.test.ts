import { test } from '@fast-check/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect, vi } from 'vitest'
import { Locale } from '../../src/Context.ts'
import * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/ReviewRequestsPage/index.ts'
import * as Routes from '../../src/routes.ts'
import * as EffectTest from '../EffectTest.ts'
import * as fc from '../fc.ts'

describe('ReviewRequestsPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
    fc.record({
      currentPage: fc.integer({ min: 0 }),
      totalPages: fc.integer(),
      field: fc.option(fc.fieldId(), { nil: undefined }),
      language: fc.option(fc.languageCode(), { nil: undefined }),
      reviewRequests: fc.nonEmptyArray(
        fc.record({
          fields: fc.array(fc.fieldId()),
          subfields: fc.array(fc.subfieldId()),
          published: fc.plainDate(),
          preprint: fc.preprintTitle(),
        }),
      ),
    }),
  ])('when the requests can be loaded', (locale, page, field, language, reviewRequests) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewRequestsPage({ field, language, page })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewRequests.href({
          page: reviewRequests.currentPage,
          field: reviewRequests.field,
          language: reviewRequests.language,
        }),
        current: 'review-requests',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        extraSkipLink: [expect.anything(), '#results'],
        js: [],
      })
    }).pipe(
      Effect.provide([
        Layer.succeed(Locale, locale),
        Layer.mock(ReviewRequests.ReviewRequests, { search: () => Effect.succeed(reviewRequests) }),
      ]),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.integer(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when the requests can't be loaded", (locale, page, field, language) =>
    Effect.gen(function* () {
      const search = vi.fn<(typeof ReviewRequests.ReviewRequests.Service)['search']>(
        _ => new ReviewRequests.ReviewRequestsAreUnavailable({}),
      )

      const actual = yield* Effect.provide(
        _.ReviewRequestsPage({ field, language, page }),
        Layer.mock(ReviewRequests.ReviewRequests, { search }),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(search).toHaveBeenCalledWith({ field, language, page })
    }).pipe(Effect.provide([Layer.succeed(Locale, locale)]), EffectTest.run),
  )

  test.prop([
    fc.supportedLocale(),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when requests can't be found", (locale, field, language) =>
    Effect.gen(function* () {
      const search = vi.fn<(typeof ReviewRequests.ReviewRequests.Service)['search']>(
        _ => new ReviewRequests.ReviewRequestsNotFound({}),
      )

      const actual = yield* Effect.provide(
        _.ReviewRequestsPage({ field, language, page: 1 }),
        Layer.mock(ReviewRequests.ReviewRequests, { search }),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewRequests.href({ page: 1, field, language }),
        current: 'review-requests',
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        extraSkipLink: [expect.anything(), '#results'],
        js: [],
      })
      expect(search).toHaveBeenCalledWith({ field, language, page: 1 })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )

  test.prop([
    fc.supportedLocale(),
    fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 2 })),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
  ])("when the requests page can't be found", (locale, page, field, language) =>
    Effect.gen(function* () {
      const search = vi.fn<(typeof ReviewRequests.ReviewRequests.Service)['search']>(
        _ => new ReviewRequests.ReviewRequestsNotFound({}),
      )

      const actual = yield* Effect.provide(
        _.ReviewRequestsPage({ field, language, page }),
        Layer.mock(ReviewRequests.ReviewRequests, { search }),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(search).toHaveBeenCalledWith({ field, language, page })
    }).pipe(Effect.provide(Layer.succeed(Locale, locale)), EffectTest.run),
  )
})
