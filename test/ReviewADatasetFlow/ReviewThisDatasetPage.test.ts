import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.js'
import * as DatasetReviews from '../../src/DatasetReviews/index.js'
import * as Datasets from '../../src/Datasets/index.js'
import * as _ from '../../src/ReviewADatasetFlow/ReviewThisDatasetPage/index.js'
import * as Routes from '../../src/routes.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import { LoggedInUser } from '../../src/user.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('ReviewThisDatasetPage', () => {
  describe('when the user is not logged in', () => {
    test.prop([fc.supportedLocale(), fc.datasetId(), fc.dataset()])(
      'the dataset can be loaded',
      (locale, datasetId, dataset) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.ReviewThisDataset.href({ datasetId: dataset.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.anything()])(
      'the dataset cannot be loaded',
      (locale, datasetId, cause) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.ServiceUnavailable,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => new Datasets.DatasetIsUnavailable({ cause }),
            }),
          ),
          Effect.provideService(Locale, locale),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.anything()])(
      'the dataset cannot be found',
      (locale, datasetId, cause) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            status: StatusCodes.NotFound,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
        }).pipe(
          Effect.provide(Layer.mock(DatasetReviews.DatasetReviewQueries, {})),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => new Datasets.DatasetIsNotFound({ cause }),
            }),
          ),
          Effect.provideService(Locale, locale),
          EffectTest.run,
        ),
    )
  })

  describe('when the user is logged in', () => {
    test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset(), fc.uuid()])(
      'a review has been started',
      (locale, datasetId, user, dataset, reviewId) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: Routes.ReviewThisDatasetStartNow.href({ datasetId: dataset.id }),
          })
        }).pipe(
          Effect.provide(
            Layer.mock(DatasetReviews.DatasetReviewQueries, {
              findInProgressReviewForADataset: () => Effect.succeedSome(reviewId),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset()])(
      "a review hasn't been started",
      (locale, datasetId, user, dataset) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.ReviewThisDataset.href({ datasetId: dataset.id }),
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
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.anything(), fc.maybe(fc.uuid())])(
      'the dataset cannot be loaded',
      (locale, datasetId, user, cause, reviewId) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

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
              findInProgressReviewForADataset: () => Effect.succeed(reviewId),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => new Datasets.DatasetIsUnavailable({ cause }),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.anything(), fc.maybe(fc.uuid())])(
      'the dataset cannot be found',
      (locale, datasetId, user, cause, reviewId) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

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
              findInProgressReviewForADataset: () => Effect.succeed(reviewId),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => new Datasets.DatasetIsNotFound({ cause }),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )

    test.prop([fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset(), fc.anything()])(
      "a review can't be queried",
      (locale, datasetId, user, dataset, cause) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

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
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
          EffectTest.run,
        ),
    )
  })
})
