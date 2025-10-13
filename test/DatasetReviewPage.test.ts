import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../src/Context.ts'
import * as _ from '../src/DatasetReviewPage/index.ts'
import * as DatasetReviews from '../src/DatasetReviews/index.ts'
import * as Datasets from '../src/Datasets/index.ts'
import * as Personas from '../src/Personas/index.ts'
import * as Routes from '../src/routes.ts'
import * as StatusCodes from '../src/StatusCodes.ts'
import * as EffectTest from './EffectTest.ts'
import * as fc from './fc.ts'

describe('DatasetReviewPage', () => {
  describe('when the review can be loaded', () => {
    test.prop([
      fc.supportedLocale(),
      fc.uuid(),
      fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }) }),
      fc.dataset(),
      fc.publicPersona(),
    ])('with a public persona', (locale, datasetReviewId, publishedReview, dataset, publicPersona) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.DatasetReview.href({ datasetReviewId: publishedReview.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          description: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'prereview',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => Effect.succeed(publishedReview),
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
          }),
        ),
        Effect.provideService(Locale, locale),
        EffectTest.run,
      ),
    )

    test.prop([
      fc.supportedLocale(),
      fc.uuid(),
      fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }) }),
      fc.dataset(),
      fc.pseudonymPersona(),
    ])('with a public persona', (locale, datasetReviewId, publishedReview, dataset, pseudonymPersona) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewPage({ datasetReviewId })

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: Routes.DatasetReview.href({ datasetReviewId: publishedReview.id }),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          description: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'prereview',
          js: [],
        })
      }).pipe(
        Effect.provide(
          Layer.mock(DatasetReviews.DatasetReviewQueries, {
            getPublishedReview: () => Effect.succeed(publishedReview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => Effect.succeed(dataset),
          }),
        ),
        Effect.provide(
          Layer.mock(Personas.Personas, {
            getPseudonymPersona: () => Effect.succeed(pseudonymPersona),
          }),
        ),
        Effect.provideService(Locale, locale),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.supportedLocale(),
    fc.uuid(),
    fc.publishedDatasetReview(),
    fc
      .tuple(fc.anything(), fc.datasetId())
      .chain(([cause, datasetId]) =>
        fc.constantFrom(
          new Datasets.DatasetIsNotFound({ cause, datasetId }),
          new Datasets.DatasetIsUnavailable({ cause, datasetId }),
        ),
      ),
    fc.publicPersona(),
    fc.pseudonymPersona(),
  ])(
    "when the dataset can't be loaded",
    (locale, datasetReviewId, publishedReview, error, publicPersona, pseudonymPersona) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewPage({ datasetReviewId })

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
            getPublishedReview: () => Effect.succeed(publishedReview),
          }),
        ),
        Effect.provide(
          Layer.mock(Datasets.Datasets, {
            getDataset: () => error,
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

  test.prop([fc.supportedLocale(), fc.uuid(), fc.publishedDatasetReview(), fc.dataset(), fc.anything()])(
    "when the persona can't be loaded",
    (locale, datasetReviewId, publishedReview, dataset, error) =>
      Effect.gen(function* () {
        const actual = yield* _.DatasetReviewPage({ datasetReviewId })

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
            getPublishedReview: () => Effect.succeed(publishedReview),
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

  test.prop([fc.supportedLocale(), fc.uuid()])('when the review is not found', (locale, datasetReviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewPage({ datasetReviewId })

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
          getPublishedReview: () => new DatasetReviews.UnknownDatasetReview({}),
        }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale(), fc.uuid()])('when the review is not published', (locale, datasetReviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewPage({ datasetReviewId })

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
          getPublishedReview: () => new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
        }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale(), fc.uuid()])("when the review can't be loaded", (locale, datasetReviewId) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewPage({ datasetReviewId })

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
          getPublishedReview: () => new DatasetReviews.UnableToQuery({}),
        }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )
})
