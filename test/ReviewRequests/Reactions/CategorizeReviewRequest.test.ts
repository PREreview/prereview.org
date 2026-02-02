import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import { OpenAlexWorks } from '../../../src/ExternalInteractions/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as Queries from '../../../src/Queries.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/CategorizeReviewRequest.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('CategorizeReviewRequest', () => {
  describe('when the request can be categorized', () => {
    test.prop([
      fc.uuid(),
      fc.publishedReviewRequest(),
      fc.preprintTitle(),
      fc.record({
        language: fc.some(fc.languageCode()),
        keywords: fc.array(fc.keywordId()),
        topics: fc.array(fc.topicId()),
      }),
    ])('when the command can be completed', (reviewRequestId, reviewRequest, preprint, categories) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(OpenAlexWorks.OpenAlexWorks, {
              getCategoriesForAReviewRequest: () => Effect.succeed(categories),
            }),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
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
      fc.preprintTitle(),
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
    ])("when the command can't be completed", (reviewRequestId, reviewRequest, preprint, categories, error) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: error })))
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(OpenAlexWorks.OpenAlexWorks, {
              getCategoriesForAReviewRequest: () => Effect.succeed(categories),
            }),
            Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
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
      language: fc.some(fc.languageCode()),
      keywords: fc.array(fc.keywordId()),
      topics: fc.array(fc.topicId()),
    }),
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
      ),
  ])("when the preprint can't be loaded", (reviewRequestId, reviewRequest, categories, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, { getCategoriesForAReviewRequest: () => Effect.succeed(categories) }),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => error }),
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
    fc.preprintTitle(),
    fc.anything().map(cause => new OpenAlexWorks.CategoriesAreNotAvailable({ cause })),
  ])("when the request can't be categorized", (reviewRequestId, reviewRequest, preprint, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, { getCategoriesForAReviewRequest: () => error }),
          Layer.mock(Preprints.Preprints, { getPreprintTitle: () => Effect.succeed(preprint) }),
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
        fc.constantFrom(new ReviewRequests.UnknownReviewRequest({ cause }), new Queries.UnableToQuery({ cause })),
      ),
  ])("when the review request can't be loaded", (reviewRequestId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.CategorizeReviewRequest(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToCategorizeReviewRequest({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(OpenAlexWorks.OpenAlexWorks, {}),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestCommands, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequest: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
