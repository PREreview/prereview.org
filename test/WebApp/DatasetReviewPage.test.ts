import { describe, expect, it } from '@effect/vitest'
import { Effect, Layer } from 'effect'
import { Locale } from '../../src/Context.ts'
import * as DatasetReviews from '../../src/DatasetReviews/index.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import * as Personas from '../../src/Personas/index.ts'
import * as Queries from '../../src/Queries.ts'
import * as Routes from '../../src/routes.ts'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/WebApp/DatasetReviewPage/index.ts'
import * as fc from '../fc.ts'

describe('DatasetReviewPage', () => {
  describe('when the review can be loaded', () => {
    it.effect.prop(
      'with a public persona',
      [
        fc.supportedLocale(),
        fc.uuid(),
        fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }) }),
        fc.dataset(),
        fc.publicPersona(),
      ],
      ([locale, datasetReviewId, publishedReview, dataset, publicPersona]) =>
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
        ),
    )

    it.effect.prop(
      'with a public persona',
      [
        fc.supportedLocale(),
        fc.uuid(),
        fc.publishedDatasetReview({ author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }) }),
        fc.dataset(),
        fc.pseudonymPersona(),
      ],
      ([locale, datasetReviewId, publishedReview, dataset, pseudonymPersona]) =>
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
        ),
    )
  })

  it.effect.prop(
    "when the dataset can't be loaded",
    [
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
    ],
    ([locale, datasetReviewId, publishedReview, error, publicPersona, pseudonymPersona]) =>
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
      ),
  )

  it.effect.prop(
    "when the persona can't be loaded",
    [fc.supportedLocale(), fc.uuid(), fc.publishedDatasetReview(), fc.dataset(), fc.anything()],
    ([locale, datasetReviewId, publishedReview, dataset, error]) =>
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
      ),
  )

  it.effect.prop('when the review is not found', [fc.supportedLocale(), fc.uuid()], ([locale, datasetReviewId]) =>
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
    ),
  )

  it.effect.prop('when the review is not published', [fc.supportedLocale(), fc.uuid()], ([locale, datasetReviewId]) =>
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
    ),
  )

  it.effect.prop("when the review can't be loaded", [fc.supportedLocale(), fc.uuid()], ([locale, datasetReviewId]) =>
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
          getPublishedReview: () => new Queries.UnableToQuery({}),
        }),
      ),
      Effect.provide(Layer.mock(Datasets.Datasets, {})),
      Effect.provide(Layer.mock(Personas.Personas, {})),
      Effect.provideService(Locale, locale),
    ),
  )
})
