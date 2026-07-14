import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Clubs } from '../../src/Clubs/index.ts'
import { Locale } from '../../src/Context.ts'
import * as DatasetReviews from '../../src/DatasetReviews/index.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Queries from '../../src/Queries.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/DatasetReviewsPage/index.ts'
import * as fc from '../fc.ts'

describe('DatasetReviewsPage', () => {
  it.effect.prop(
    'when reviews can be loaded',
    [
      fc.supportedLocale(),
      fc.datasetId(),
      fc.array(fc.uuid()),
      fc.publishedDatasetReview(),
      fc.dataset(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
      fc.clubName(),
    ],
    ([locale, datasetId, datasetReviewIds, datasetReview, dataset, publicPersona, pseudonymPersona, club]) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewsPage({ datasetId })

        expect(actual).toStrictEqual({
          _tag: 'TwoUpPageResponse',
          canonical: Routes.DatasetReviews.href({ datasetId: dataset.id }),
          title: expect.anything(),
          description: expect.anything(),
          h1: expect.anything(),
          aside: expect.anything(),
          main: expect.anything(),
          type: 'dataset',
        })
      }).pipe(
        Effect.provide([
          Layer.mock(Clubs, { getClubName: () => Effect.succeed(club) }),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ]),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(
          Layer.mock(Prereviewers.Prereviewers, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    "when personas can't be loaded",
    [
      fc.supportedLocale(),
      fc.datasetId(),
      fc.nonEmptyArray(fc.uuid()),
      fc.publishedDatasetReview(),
      fc.dataset(),
      fc.anything(),
    ],
    ([locale, datasetId, datasetReviewIds, datasetReview, dataset, error]) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewsPage({ datasetId })

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
          Layer.mock(Clubs, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ]),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(
          Layer.mock(Prereviewers.Prereviewers, {
            getPublicPersona: () => new Prereviewers.UnableToGetPersona({ cause: error }),
            getPseudonymPersona: () => new Prereviewers.UnableToGetPersona({ cause: error }),
          }),
        ),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    "when reviews can't be loaded",
    [
      fc.supportedLocale(),
      fc.datasetId(),
      fc.nonEmptyArray(fc.uuid()),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        new Queries.UnableToQuery({}),
        new DatasetReviews.UnknownDatasetReview({}),
      ),
      fc.dataset(),
    ],
    ([locale, datasetId, datasetReviewIds, error, dataset]) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewsPage({ datasetId })

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
          Layer.mock(Clubs, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => error,
          }),
        ]),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(Layer.mock(Prereviewers.Prereviewers, {})),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    "when the dataset can't be loaded",
    [
      fc.supportedLocale(),
      fc.datasetId(),
      fc.nonEmptyArray(fc.uuid()),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        new Queries.UnableToQuery({}),
        new DatasetReviews.UnknownDatasetReview({}),
      ),
      fc.publishedDatasetReview(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ],
    ([locale, datasetId, datasetReviewIds, error, datasetReview, publicPersona, pseudonymPersona]) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewsPage({ datasetId })

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
          Layer.mock(Clubs, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ]),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: datasetId => new Datasets.DatasetIsUnavailable({ cause: error, datasetId }),
          }),
        ),
        Effect.provide(
          Layer.mock(Prereviewers.Prereviewers, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop(
    'when the dataset is not found',
    [
      fc.supportedLocale(),
      fc.datasetId(),
      fc.nonEmptyArray(fc.uuid()),
      fc.constantFrom(
        new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        new Queries.UnableToQuery({}),
        new DatasetReviews.UnknownDatasetReview({}),
      ),
      fc.publishedDatasetReview(),
      fc.publicPersona(),
      fc.pseudonymPersona(),
    ],
    ([locale, datasetId, datasetReviewIds, error, datasetReview, publicPersona, pseudonymPersona]) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewsPage({ datasetId })

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
          Layer.mock(Clubs, {}),
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ]),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: datasetId => new Datasets.DatasetIsNotFound({ cause: error, datasetId }),
          }),
        ),
        Effect.provide(
          Layer.mock(Prereviewers.Prereviewers, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
      ),
  )

  it.effect.prop("when review IDs can't be loaded", [fc.supportedLocale(), fc.datasetId()], ([locale, datasetId]) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewsPage({ datasetId })

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
        Layer.mock(Clubs, {}),
        Layer.mock(DatasetReviews.DatasetReviewQueries, {
          findPublishedReviewsForADataset: () => new Queries.UnableToQuery({}),
        }),
      ]),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Prereviewers.Prereviewers, {})),
      Effect.provideService(Locale, locale),
    ),
  )
})
