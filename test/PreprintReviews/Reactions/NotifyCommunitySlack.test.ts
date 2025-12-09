import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as PreprintReviews from '../../../src/PreprintReviews/index.ts'
import * as _ from '../../../src/PreprintReviews/Reactions/NotifyCommunitySlack.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  test.prop([fc.integer(), fc.origin(), fc.prereview()])(
    'when the Slack can be notified',
    (preprintReviewId, publicUrl, prereview) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.either)

        expect(actual).toStrictEqual(Either.void)
      }).pipe(
        Effect.provide(
          Layer.mergeAll(
            Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReview: () => Effect.void }),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) }),
            Layer.succeed(PublicUrl, publicUrl),
          ),
        ),
        EffectTest.run,
      ),
  )

  test.prop([
    fc.integer(),
    fc.origin(),
    fc.prereview(),
    fc.anything().map(cause => new CommunitySlack.FailedToSharePreprintReview({ cause })),
  ])("when the Slack can't be notified", (preprintReviewId, publicUrl, prereview, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyCommunitySlack({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReview: () => error }),
          Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(prereview) }),
          Layer.succeed(PublicUrl, publicUrl),
        ),
      ),
      EffectTest.run,
    ),
  )

  test.prop([
    fc.integer(),
    fc.origin(),
    fc.constantFrom(
      new Prereviews.PrereviewIsNotFound(),
      new Prereviews.PrereviewIsUnavailable(),
      new Prereviews.PrereviewWasRemoved(),
    ),
  ])("when the published review can't be loaded", (preprintReviewId, publicUrl, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyCommunitySlack({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Prereviews.Prereviews, { getPrereview: () => error }),
          Layer.succeed(PublicUrl, publicUrl),
        ),
      ),
      EffectTest.run,
    ),
  )
})
