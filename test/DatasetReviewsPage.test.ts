import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../src/Context.js'
import * as DatasetReviews from '../src/DatasetReviews/index.js'
import * as _ from '../src/DatasetReviewsPage/index.js'
import * as Routes from '../src/routes.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('DatasetReviewsPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.array(fc.uuid()),
    fc.record({
      author: fc.record(
        {
          name: fc.string(),
          orcid: fc.orcid(),
        },
        { requiredKeys: ['name'] },
      ),
      doi: fc.doi(),
      id: fc.uuid(),
      questions: fc.record({
        answerToIfTheDatasetFollowsFairAndCarePrinciples: fc.constantFrom('yes', 'partly', 'no', 'unsure'),
        answerToIfTheDatasetHasEnoughMetadata: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasTrackedChanges: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
        answerToIfTheDatasetHasDataCensoredOrDeleted: fc.maybe(fc.constantFrom('yes', 'partly', 'no', 'unsure')),
      }),
      published: fc.plainDate(),
    }),
  ])('when reviews can be loaded', (locale, datasetReviewIds, datasetReview) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewsPage()

      expect(actual).toStrictEqual({
        _tag: 'TwoUpPageResponse',
        canonical: Routes.DatasetReviews,
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
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.supportedLocale(),
    fc.nonEmptyArray(fc.uuid()),
    fc.constantFrom(
      new DatasetReviews.DatasetReviewHasNotBeenPublished({}),
      new DatasetReviews.UnableToQuery({}),
      new DatasetReviews.UnknownDatasetReview({}),
    ),
  ])("when reviews can't be loaded", (locale, datasetReviewIds, error) =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewsPage()

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
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )

  test.prop([fc.supportedLocale()])("when review IDs can't be loaded", locale =>
    Effect.gen(function* () {
      const actual = yield* _.DatasetReviewsPage()

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
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )
})
