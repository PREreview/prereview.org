import { Effect, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import { Comments, CommentsAreUnavailable } from '../../../src/Domain/Comments/index.ts'
import * as PreprintReviews from '../../../src/Domain/PreprintReviews/index.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/PreprintReviewPage/index.ts'
import * as fc from '../../fc.ts'
import { describe, expect, it } from '../../vitest.ts'

const publishedComment = fc.record({
  author: fc.persona(),
  comment: fc.html(),
  commentId: fc.uuid(),
  competingInterests: fc.maybe(fc.nonEmptyString()),
  doi: fc.doi(),
  id: fc.integer(),
  language: fc.languageCode(),
  license: fc.constant('CC-BY-4.0' as const),
  publishedAt: fc.instant(),
})

describe('PreprintReviewPage', () => {
  it.effect.prop(
    'when the review can be loaded',
    [fc.supportedLocale(), fc.integer(), fc.prereview(), fc.array(publishedComment)],
    ([locale, id, prereview, comments]) =>
      Effect.gen(function* () {
        const actual = yield* _.PreprintReviewPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.Review.href({ id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          description: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'prereview',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.mock(PreprintReviews.PreprintReviews, { getPreprintReview: () => Effect.succeed(prereview) }),
          Layer.mock(Comments, { getPublishedCommentsForAPrereview: () => Effect.succeed(comments) }),
        ]),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop('when the review is not found', [fc.supportedLocale(), fc.integer()], ([locale, id]) =>
    Effect.gen(function* () {
      const actual = yield* _.PreprintReviewPage({ id })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide([
        Layer.mock(PreprintReviews.PreprintReviews, {
          getPreprintReview: () => new PreprintReviews.PrereviewIsNotFound(),
        }),
        Layer.mock(Comments, {}),
      ]),
      Effect.provideService(Locale, locale),
    ),
  )

  it.effect.prop('when the review was removed', [fc.supportedLocale(), fc.integer()], ([locale, id]) =>
    Effect.gen(function* () {
      const actual = yield* _.PreprintReviewPage({ id })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.Gone,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide([
        Layer.mock(PreprintReviews.PreprintReviews, {
          getPreprintReview: () => new PreprintReviews.PrereviewWasRemoved(),
        }),
        Layer.mock(Comments, {}),
      ]),
      Effect.provideService(Locale, locale),
    ),
  )

  it.effect.prop("when the review can't be loaded", [fc.supportedLocale(), fc.integer()], ([locale, id]) =>
    Effect.gen(function* () {
      const actual = yield* _.PreprintReviewPage({ id })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide([
        Layer.mock(PreprintReviews.PreprintReviews, {
          getPreprintReview: () => new PreprintReviews.PrereviewIsUnavailable({}),
        }),
        Layer.mock(Comments, {}),
      ]),
      Effect.provideService(Locale, locale),
    ),
  )

  it.effect.prop(
    "when the comments can't be loaded",
    [fc.supportedLocale(), fc.integer(), fc.prereview()],
    ([locale, id, prereview]) =>
      Effect.gen(function* () {
        const actual = yield* _.PreprintReviewPage({ id })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide([
          Layer.mock(PreprintReviews.PreprintReviews, { getPreprintReview: () => Effect.succeed(prereview) }),
          Layer.mock(Comments, { getPublishedCommentsForAPrereview: () => new CommentsAreUnavailable({}) }),
        ]),
        Effect.provideService(Locale, locale),
      ),
  )
})
