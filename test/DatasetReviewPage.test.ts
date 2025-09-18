import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../src/Context.js'
import * as _ from '../src/DatasetReviewPage/index.js'
import * as DatasetReviews from '../src/DatasetReviews/index.js'
import * as Datasets from '../src/Datasets/index.js'
import * as Personas from '../src/Personas/index.js'
import * as Routes from '../src/routes.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('DatasetReviewPage', () => {
  describe('when the review can be loaded', () => {
    test.prop([
      fc.supportedLocale(),
      fc.uuid(),
      fc.record<DatasetReviews.PublishedReview>({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('public') }),
        doi: fc.doi(),
        id: fc.uuid(),
        questions: fc.record({
          qualityRating: fc.maybe(fc.constantFrom('excellent', 'fair', 'poor', 'unsure')),
          answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
          answerToIfTheDatasetHasEnoughMetadata: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetHasTrackedChanges: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
            fc.constantFrom('yes', 'partly', 'no', 'unsure'),
          ),
          answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsDetailedEnough: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsErrorFree: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetMattersToItsAudience: fc.maybe(
            fc.constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
          ),
          answerToIfTheDatasetIsReadyToBeShared: fc.maybe(fc.constantFrom('yes', 'no', 'unsure')),
          answerToIfTheDatasetIsMissingAnything: fc.maybe(fc.nonEmptyString()),
        }),
        competingInterests: fc.maybe(fc.nonEmptyString()),
        published: fc.plainDate(),
      }),
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
      fc.record<DatasetReviews.PublishedReview>({
        author: fc.record({ orcidId: fc.orcidId(), persona: fc.constant('pseudonym') }),
        doi: fc.doi(),
        id: fc.uuid(),
        questions: fc.record({
          qualityRating: fc.maybe(fc.constantFrom('excellent', 'fair', 'poor', 'unsure')),
          answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
          answerToIfTheDatasetHasEnoughMetadata: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetHasTrackedChanges: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
            fc.constantFrom('yes', 'partly', 'no', 'unsure'),
          ),
          answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsDetailedEnough: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetIsErrorFree: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
          answerToIfTheDatasetMattersToItsAudience: fc.maybe(
            fc.constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
          ),
          answerToIfTheDatasetIsReadyToBeShared: fc.maybe(fc.constantFrom('yes', 'no', 'unsure')),
          answerToIfTheDatasetIsMissingAnything: fc.maybe(fc.nonEmptyString()),
        }),
        competingInterests: fc.maybe(fc.nonEmptyString()),
        published: fc.plainDate(),
      }),
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
    fc.record<DatasetReviews.PublishedReview>({
      author: fc.record({ orcidId: fc.orcidId(), persona: fc.constantFrom('public', 'pseudonym') }),
      doi: fc.doi(),
      id: fc.uuid(),
      questions: fc.record({
        qualityRating: fc.maybe(fc.constantFrom('excellent', 'fair', 'poor', 'unsure')),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
          fc.constantFrom('yes', 'partly', 'no', 'unsure'),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsDetailedEnough: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsErrorFree: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetMattersToItsAudience: fc.maybe(
          fc.constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
        ),
        answerToIfTheDatasetIsReadyToBeShared: fc.maybe(fc.constantFrom('yes', 'no', 'unsure')),
        answerToIfTheDatasetIsMissingAnything: fc.maybe(fc.nonEmptyString()),
      }),
      competingInterests: fc.maybe(fc.nonEmptyString()),
      published: fc.plainDate(),
    }),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Datasets.DatasetIsNotFound({ cause }), new Datasets.DatasetIsUnavailable({ cause })),
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

  test.prop([
    fc.supportedLocale(),
    fc.uuid(),
    fc.record<DatasetReviews.PublishedReview>({
      author: fc.record({ orcidId: fc.orcidId(), persona: fc.constantFrom('public', 'pseudonym') }),
      doi: fc.doi(),
      id: fc.uuid(),
      questions: fc.record({
        qualityRating: fc.maybe(fc.constantFrom('excellent', 'fair', 'poor', 'unsure')),
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsAppropriateForThisKindOfResearch: fc.maybe(
          fc.constantFrom('yes', 'partly', 'no', 'unsure'),
        ),
        answerToIfTheDatasetSupportsRelatedConclusions: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsDetailedEnough: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetIsErrorFree: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetMattersToItsAudience: fc.maybe(
          fc.constantFrom('very-consequential', 'somewhat-consequential', 'not-consequential', 'unsure'),
        ),
        answerToIfTheDatasetIsReadyToBeShared: fc.maybe(fc.constantFrom('yes', 'no', 'unsure')),
        answerToIfTheDatasetIsMissingAnything: fc.maybe(fc.nonEmptyString()),
      }),
      competingInterests: fc.maybe(fc.nonEmptyString()),
      published: fc.plainDate(),
    }),
    fc.dataset(),
    fc.anything(),
  ])("when the persona can't be loaded", (locale, datasetReviewId, publishedReview, dataset, error) =>
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
