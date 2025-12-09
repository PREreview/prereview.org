import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import * as FeatureFlags from '../../../src/FeatureFlags.ts'
import * as PreprintReviews from '../../../src/PreprintReviews/index.ts'
import * as _ from '../../../src/PreprintReviews/Reactions/NotifyPreprintServer.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('NotifyPreprintServer', () => {
  describe('when the review can be loaded', () => {
    test.prop([fc.integer(), fc.prereview()])('when the feature is enabled', (reviewId, review) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: 'not implemented' })),
        )
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            featureFlagsLayer(true),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
          ),
        ),
        EffectTest.run,
      ),
    )

    test.prop([fc.integer(), fc.prereview()])('when the feature is sandboxed', (reviewId, review) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

        expect(actual).toStrictEqual(
          Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: 'not implemented' })),
        )
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            featureFlagsLayer(true),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
          ),
        ),
        EffectTest.run,
      ),
    )
  })

  test.prop([
    fc.integer(),
    fc.constantFrom(
      new Prereviews.PrereviewIsNotFound(),
      new Prereviews.PrereviewIsUnavailable(),
      new Prereviews.PrereviewWasRemoved(),
    ),
  ])("when the review can't be loaded", (reviewId, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(featureFlagsLayer('sandbox'), Layer.mock(Prereviews.Prereviews, { getPrereview: () => error })),
      ),
      EffectTest.run,
    ),
  )

  test.prop([fc.integer()])('when the feature is not enabled', reviewId =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(Layer.mergeAll(featureFlagsLayer(false), Layer.mock(Prereviews.Prereviews, {}))),
      EffectTest.run,
    ),
  )
})

const featureFlagsLayer = (
  sendCoarNotifyMessages: (typeof FeatureFlags.FeatureFlags.Service)['sendCoarNotifyMessages'],
) =>
  FeatureFlags.layer({
    aiReviewsAsCc0: shouldNotBeCalled,
    askAiReviewEarly: shouldNotBeCalled,
    canAddMultipleAuthors: shouldNotBeCalled,
    canLogInAsDemoUser: false,
    canReviewDatasets: false,
    enableCoarNotifyInbox: false,
    sendCoarNotifyMessages,
    useCrowdinInContext: false,
  })
