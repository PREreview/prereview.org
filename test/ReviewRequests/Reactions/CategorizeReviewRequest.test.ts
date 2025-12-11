import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, Option, pipe } from 'effect'
import { OpenAlexWorks } from '../../../src/ExternalInteractions/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/CategorizeReviewRequest.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('CategorizeReviewRequest', () => {
  describe('when the request can be categorized', () => {
    test.prop([
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.record({
        language: fc.some(fc.languageCode()),
        keywords: fc.array(fc.keywordId()),
        topics: fc.array(fc.topicId()),
      }),
    ])('when the command can be completed', (reviewRequestId, reviewRequest, categories) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(OpenAlexWorks.OpenAlexWorks, {
              getCategoriesForAReviewRequest: () => Effect.succeed(categories),
            }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              categorizeReviewRequest: () => Effect.void,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
    test.prop([
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.record({
        language: fc.some(fc.languageCode()),
        keywords: fc.array(fc.keywordId()),
        topics: fc.array(fc.topicId()),
      }),
      fc
        .anything()
        .chain(cause =>
          fc.constantFrom(
            new ReviewRequests.ReviewRequestWasAlreadyCategorized({ cause }),
            new ReviewRequests.UnableToHandleCommand({ cause }),
          ),
        ),
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, categories, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: error })))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(OpenAlexWorks.OpenAlexWorks, {
              getCategoriesForAReviewRequest: () => Effect.succeed(categories),
            }),
            Layer.mock(ReviewRequests.ReviewRequestCommands, {
              categorizeReviewRequest: () => error,
            }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
            }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.uuid(),
    fc.publishedReviewRequest(),
    fc.record({
      language: fc.constant(Option.none()),
      keywords: fc.array(fc.keywordId()),
      topics: fc.array(fc.topicId()),
    }),
  ])("when the request doesn't have a language", (reviewRequestId, reviewRequest, categories) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(
        Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: 'no language' })),
      )
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, { getCategoriesForAReviewRequest: () => Effect.succeed(categories) }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc.publishedReviewRequest(),
    fc.anything().map(cause => new OpenAlexWorks.CategoriesAreNotAvailable({ cause })),
  ])("when the request can't be categorized", (reviewRequestId, reviewRequest, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, { getCategoriesForAReviewRequest: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {
            getPublishedReviewRequest: () => Effect.succeed(reviewRequest),
          }),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.uuid(),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(
          new ReviewRequests.UnknownReviewRequest({ cause }),
          new ReviewRequests.UnableToQuery({ cause }),
        ),
      ),
  ])("when the review request can't be loaded", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequest: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
