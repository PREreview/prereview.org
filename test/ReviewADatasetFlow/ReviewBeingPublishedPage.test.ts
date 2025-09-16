import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Equal, Layer } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewBeingPublishedPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('ReviewBeingPublishedPage', () => {
  describe('when the dataset review is by the user', () => {
    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review is being published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'StreamlinePageResponse',
            canonical: Routes.ReviewADatasetReviewBeingPublished.href({ datasetReviewId }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: ['poll-redirect.js'],
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfReviewIsBeingPublished: () => Effect.void,
              getAuthor: () => Effect.succeed(user.orcid),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.uuid(), fc.supportedLocale(), fc.user()])(
      'when the dataset review has been published',
      (datasetReviewId, locale, user) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewADatasetReviewPublished.href({ datasetReviewId }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              checkIfReviewIsBeingPublished: () => new DatasetReviews.DatasetReviewHasBeenPublished(),
              getAuthor: () => Effect.succeed(user.orcid),
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
          const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

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
              checkIfReviewIsBeingPublished: () => new DatasetReviews.DatasetReviewIsInProgress(),
              getAuthor: () => Effect.succeed(user.orcid),
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
      const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

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
        const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

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
        const actual = yield* _.ReviewBeingPublishedPage({ datasetReviewId })

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
          Layer.mock(DatasetReviews.DatasetReviewQueries, { getAuthor: () => new DatasetReviews.UnableToQuery({}) }),
        ),
        Effect.provideService(Locale, locale),
        Effect.provideService(LoggedInUser, user),
        EffectTest.run,
      ),
  )
})
