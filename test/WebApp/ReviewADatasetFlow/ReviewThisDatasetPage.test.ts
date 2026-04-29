import { it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { describe, expect } from 'vitest'
import { Locale } from '../../../src/Context.ts'
import * as DatasetReviews from '../../../src/DatasetReviews/index.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as Routes from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../src/user.ts'
import * as _ from '../../../src/WebApp/ReviewADatasetFlow/ReviewThisDatasetPage/index.ts'
import * as fc from '../../fc.ts'

describe('ReviewThisDatasetPage', () => {
  describe('when the user is not logged in', () => {
    it.effect.prop(
      'the dataset can be loaded',
      [fc.supportedLocale(), fc.datasetId(), fc.dataset()],
      ([locale, datasetId, dataset]) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.ReviewThisDataset.href({ datasetId: dataset.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
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
        ),
    )

    it.effect.prop(
      'the dataset cannot be loaded',
      [
        fc.supportedLocale(),
        fc.datasetId(),
        fc
          .record({ cause: fc.anything(), datasetId: fc.datasetId() })
          .map(args => new Datasets.DatasetIsUnavailable(args)),
      ],
      ([locale, datasetId, error]) =>
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
              getDataset: () => error,
            }),
          ),
          Effect.provideService(Locale, locale),
        ),
    )

    it.effect.prop(
      'the dataset cannot be found',
      [
        fc.supportedLocale(),
        fc.datasetId(),
        fc
          .record({ cause: fc.anything(), datasetId: fc.datasetId() })
          .map(args => new Datasets.DatasetIsNotFound(args)),
      ],
      ([locale, datasetId, error]) =>
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
              getDataset: () => error,
            }),
          ),
          Effect.provideService(Locale, locale),
        ),
    )
  })

  describe('when the user is logged in', () => {
    it.effect.prop(
      'a review has been started',
      [fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset(), fc.uuid()],
      ([locale, datasetId, user, dataset, reviewId]) =>
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
        ),
    )

    it.effect.prop(
      "a review hasn't been started",
      [fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset()],
      ([locale, datasetId, user, dataset]) =>
        Effect.gen(function* () {
          const actual = yield* _.ReviewThisDatasetPage({ datasetId })

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: Routes.ReviewThisDataset.href({ datasetId: dataset.id }),
            status: StatusCodes.OK,
            title: expect.anything(),
            nav: expect.anything(),
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
        ),
    )

    it.effect.prop(
      'the dataset cannot be loaded',
      [
        fc.supportedLocale(),
        fc.datasetId(),
        fc.user(),
        fc
          .record({ cause: fc.anything(), datasetId: fc.datasetId() })
          .map(args => new Datasets.DatasetIsUnavailable(args)),
        fc.maybe(fc.uuid()),
      ],
      ([locale, datasetId, user, error, reviewId]) =>
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
              getDataset: () => error,
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      'the dataset cannot be found',
      [
        fc.supportedLocale(),
        fc.datasetId(),
        fc.user(),
        fc
          .record({ cause: fc.anything(), datasetId: fc.datasetId() })
          .map(args => new Datasets.DatasetIsNotFound(args)),
        fc.maybe(fc.uuid()),
      ],
      ([locale, datasetId, user, error, reviewId]) =>
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
              getDataset: () => error,
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
        ),
    )

    it.effect.prop(
      "a review can't be queried",
      [fc.supportedLocale(), fc.datasetId(), fc.user(), fc.dataset(), fc.anything()],
      ([locale, datasetId, user, dataset, cause]) =>
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
              findInProgressReviewForADataset: () => new Queries.UnableToQuery({ cause }),
            }),
          ),
          Effect.provide(
            Layer.mock(Datasets.Datasets, {
              getDataset: () => Effect.succeed(dataset),
            }),
          ),
          Effect.provideService(Locale, locale),
          Effect.provideService(LoggedInUser, user),
        ),
    )
  })
})
