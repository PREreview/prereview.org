import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, pipe } from 'effect'
import * as FeatureFlags from '../../../src/FeatureFlags.ts'
import * as PreprintReviews from '../../../src/PreprintReviews/index.ts'
import * as _ from '../../../src/PreprintReviews/Reactions/NotifyPreprintServer.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('NotifyPreprintServer', () => {
  test.prop([fc.integer()])('when the feature is enabled', reviewId =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(
        Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: 'not implemented' })),
      )
    }).pipe(Effect.provide(featureFlagsLayer(true)), EffectTest.run),
  )

  test.prop([fc.integer()])('when the feature is sandboxed', reviewId =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(
        Either.left(new PreprintReviews.FailedToNotifyPreprintServer({ cause: 'not implemented' })),
      )
    }).pipe(Effect.provide(featureFlagsLayer('sandbox')), EffectTest.run),
  )

  test.prop([fc.integer()])('when the feature is not enabled', reviewId =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyPreprintServer(reviewId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(Effect.provide(featureFlagsLayer(false)), EffectTest.run),
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
