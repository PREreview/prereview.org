import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as Prereviews from '../../../src/Domain/Prereviews/index.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/reviews-page/index.ts'
import { reviewsMatch } from '../../../src/routes.ts'
import * as fc from '../../fc.ts'
import { describe, expect, it, vi } from '../../vitest.ts'

describe('reviewsPage', () => {
  it.effect.prop(
    'when the recent reviews can be loaded',
    [
      fc.supportedLocale(),
      fc.integer(),
      fc.option(fc.fieldId(), { nil: undefined }),
      fc.record({
        currentPage: fc.integer(),
        totalPages: fc.integer(),
        field: fc.option(fc.fieldId(), { nil: undefined }),
        recentPrereviews: fc.nonEmptyArray(
          fc.oneof(
            fc
              .record({
                id: fc.integer(),
                reviewers: fc.record({
                  named: fc.nonEmptyArray(fc.name()),
                  anonymous: fc.integer({ min: 0 }),
                }),
                published: fc.plainDate(),
                fields: fc.array(fc.fieldId()),
                subfields: fc.array(fc.subfieldId()),
                preprint: fc.preprintTitle(),
              })
              .map(args => new Prereviews.RecentPreprintPrereview(args)),
            fc
              .record({
                id: fc.uuid(),
                doi: fc.doi(),
                author: fc.persona(),
                otherAuthors: fc.array(fc.persona()),
                anonymousAuthors: fc.integer({ min: 0 }),
                published: fc.plainDate(),
                dataset: fc.datasetTitle(),
              })
              .map(args => new Prereviews.RecentDatasetPrereview(args)),
          ),
        ),
      }),
    ],
    ([locale, page, field, recentPrereviews]) =>
      Effect.gen(function* () {
        const getRecentPrereviews = vi.fn<_.GetRecentPrereviewsEnv['getRecentPrereviews']>(() =>
          TE.right(recentPrereviews),
        )

        const actual = yield* Effect.promise(_.reviewsPage({ field, locale, page })({ getRecentPrereviews }))

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(reviewsMatch.formatter, {
            page: recentPrereviews.currentPage,
            field: recentPrereviews.field,
          }),
          current: 'reviews',
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          extraSkipLink: [expect.anything(), '#results'],
          js: [],
        })
        expect(getRecentPrereviews).toHaveBeenCalledWith({ field, page })
      }),
  )

  it.effect.prop(
    'when there are no reviews',
    [fc.supportedLocale(), fc.option(fc.fieldId(), { nil: undefined })],
    ([locale, field]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.reviewsPage({ field, locale, page: 1 })({
            getRecentPrereviews: () => TE.left('not-found'),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(reviewsMatch.formatter, { page: 1, field }),
          current: 'reviews',
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          extraSkipLink: [expect.anything(), '#results'],
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the page is not found',
    [
      fc.supportedLocale(),
      fc.oneof(fc.integer({ max: 0 }), fc.integer({ min: 2 })),
      fc.option(fc.fieldId(), { nil: undefined }),
    ],
    ([locale, page, field]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.reviewsPage({ field, locale, page })({
            getRecentPrereviews: () => TE.left('not-found'),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop(
    'when the recent reviews cannot be loaded',
    [fc.supportedLocale(), fc.integer(), fc.option(fc.fieldId(), { nil: undefined })],
    ([locale, page, field]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.reviewsPage({ field, locale, page })({
            getRecentPrereviews: () => TE.left('unavailable'),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )
})
