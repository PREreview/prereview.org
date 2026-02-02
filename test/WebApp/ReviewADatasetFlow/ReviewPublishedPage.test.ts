import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, Layer } from 'effect'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewPublishedPage/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('ReviewPublishedPage', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([fc.uuid(), fc.publishedDatasetReviewDetails(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, datasetReview, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId: datasetReview.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPublishedReviewDetails: () => Effect.succeed(datasetReview),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPublishedReviewDetails: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is in progress',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              getAuthor: () => Effect.succeed(user.orcid),
              getPublishedReviewDetails: () => new DatasetReviews.DatasetReviewIsBeingPublished(),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.supportedLocale(),
    fc
      .tuple(fc.user(), fc.orcidId())
      .filter(([user, datasetReviewAuthor]) => !Equal.equals(user.orcid, datasetReviewAuthor)),
  ])('when the dataset review is by a different user', (datasetReviewId, locale, [user, datasetReviewAuthor]) =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.NotFound,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => Effect.succeed(datasetReviewAuthor) }),
      ),
      Effect.provideService(Locale, locale),
      Effect.provideService(LoggedInUser, user),
      EffectTest.run,
    ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review hasn't been started",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.NotFound,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getAuthor: () => new DatasetReviews.UnknownDatasetReview({}),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )

  test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
    "when the dataset review can't been queried",
    (datasetReviewId, locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewPublishedPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new Queries.UnableToQuery({}) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})
