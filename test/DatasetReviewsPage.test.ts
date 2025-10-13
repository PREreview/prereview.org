import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../src/Context.ts'
import * as DatasetReviews from '../src/DatasetReviews/index.ts'
import * as _ from '../src/DatasetReviewsPage/index.ts'
import * as Datasets from '../src/Datasets/index.ts'
import * as Personas from '../src/Personas/index.ts'
import * as Routes from '../src/routes.ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'

describe('DatasetReviewsPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.array(fc.uuid()),
    fc.publishedDatasetReview(),
    fc.dataset(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    'when reviews can be loaded',
    (locale, datasetId, datasetReviewIds, datasetReview, dataset, publicPersona, pseudonymPersona) =>
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
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.nonEmptyArray(fc.uuid()),
    fc.publishedDatasetReview(),
    fc.dataset(),
    fc.anything(),
  ])("when personas can't be loaded", (locale, datasetId, datasetReviewIds, datasetReview, dataset, error) =>
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
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, {
          findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
          getPublishedReview: () => Effect.succeed(datasetReview),
        }),
      ),
      Effect.provide(
        Layer.mock(Datasets.Datasets, {
          getDataset: () => Effect.succeed(dataset),
        }),
      ),
      Effect.provide(
        Layer.mock(Personas.Personas, {
          getPublicPersona: () => new Personas.UnableToGetPersona({ cause: error }),
          getPseudonymPersona: () => new Personas.UnableToGetPersona({ cause: error }),
        }),
      ),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.nonEmptyArray(fc.uuid()),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.UnableToQuery({}),
      new DatasetReviews.UnknownDatasetReview({}),
    ),
    fc.dataset(),
  ])("when reviews can't be loaded", (locale, datasetId, datasetReviewIds, error, dataset) =>
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
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, {
          findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
          getPublishedReview: () => error,
        }),
      ),
      Effect.provide(
        Layer.mock(Datasets.Datasets, {
          getDataset: () => Effect.succeed(dataset),
        }),
      ),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.nonEmptyArray(fc.uuid()),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.UnableToQuery({}),
      new DatasetReviews.UnknownDatasetReview({}),
    ),
    fc.publishedDatasetReview(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    "when the dataset can't be loaded",
    (locale, datasetId, datasetReviewIds, error, datasetReview, publicPersona, pseudonymPersona) =>
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
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: datasetId => new Datasets.DatasetIsUnavailable({ cause: error, datasetId }),
          }),
        ),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.datasetId(),
    fc.nonEmptyArray(fc.uuid()),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.UnableToQuery({}),
      new DatasetReviews.UnknownDatasetReview({}),
    ),
    fc.publishedDatasetReview(),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    'when the dataset is not found',
    (locale, datasetId, datasetReviewIds, error, datasetReview, publicPersona, pseudonymPersona) =>
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
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            findPublishedReviewsForADataset: () => Effect.succeed(datasetReviewIds),
            getPublishedReview: () => Effect.succeed(datasetReview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: datasetId => new Datasets.DatasetIsNotFound({ cause: error, datasetId }),
          }),
        ),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPublicPersona: () => Effect.succeed(publicPersona),
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
        EffectTest.run,
      ),
  )

  test.prop([fc.supportedLocale(), fc.datasetId()])("when review IDs can't be loaded", (locale, datasetId) =>
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
      Effect.provide(
        Layer.mock(DatasetReviews.DatasetReviewQueries, {
          findPublishedReviewsForADataset: () => new DatasetReviews.UnableToQuery({}),
        }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )
})
