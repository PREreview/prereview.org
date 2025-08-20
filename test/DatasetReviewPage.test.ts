import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Layer } from 'effect'
import { Locale } from '../src/Context.js'
import * as _ from '../src/DatasetReviewPage/index.js'
import * as DatasetReviews from '../src/DatasetReviews/index.js'
import * as Routes from '../src/routes.js'
import * as StatusCodes from '../src/StatusCodes.js'
import * as EffectTest from './EffectTest.js'
import * as fc from './fc.js'

describe('DatasetReviewPage', () => {
  test.prop([
    fc.supportedLocale(),
    fc.uuid(),
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
      }),
      published: fc.plainDate(),
    }),
  ])('when the review can be loaded', (locale, datasetReviewId, publishedReview) =>
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
      Effect.provideService(Locale, locale),
      EffectTest.run,
    ),
  )
})
