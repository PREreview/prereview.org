import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewThisDatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('ReviewThisDatasetPage', () => {
  test.prop([fc.supportedLocale()])('when the user is not logged in', locale =>
    Effect.gen(function* () {
      const actual = yield* _.ReviewThisDatasetPage

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ReviewThisDataset,
        status: StatusCodes.OK,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    }).pipe(
      Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  describe('when the user is logged in', () => {
    test.prop([fc.supportedLocale(), fc.user(), fc.uuid()])('a review has been started', (locale, user, reviewId) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewThisDatasetPage

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: Routes.ReviewThisDatasetStartNow,
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => Effect.succeedSome(reviewId),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.supportedLocale(), fc.user()])("a review hasn't been started", (locale, user) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewThisDatasetPage

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.ReviewThisDataset,
          status: StatusCodes.OK,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => Effect.succeedNone,
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )

    test.prop([fc.supportedLocale(), fc.user(), fc.anything()])("a review can't be queried", (locale, user, cause) =>
      Effect.gen(function* () {
        const actual = yield* _.ReviewThisDatasetPage

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
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findInProgressReviewForADataset: () => new DatasetReviews.UnableToQuery({ cause }),
          }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
    )
  })
})
