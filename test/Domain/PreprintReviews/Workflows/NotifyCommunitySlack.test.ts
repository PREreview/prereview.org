import { describe, expect, it } from '../../../vitest.ts'
import { Effect, Result, Layer, pipe } from 'effect'
import { CommunitySlack } from '../../../../src/ExternalInteractions/index.ts'
import * as PreprintReviews from '../../../../src/Domain/PreprintReviews/index.ts'
import * as _ from '../../../../src/Domain/PreprintReviews/Workflows/NotifyCommunitySlack.ts'
import { PublicUrl } from '../../../../src/public-url.ts'
import * as fc from '../../../fc.ts'

describe('NotifyCommunitySlack', () => {
  it.effect.prop(
    'when the Slack can be notified',
    [fc.integer(), fc.origin(), fc.prereview()],
    ([preprintReviewId, publicUrl, prereview]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.result)

        expect(actual).toStrictEqual(Result.void)
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReview: () => Effect.void }),
          Layer.mock(PreprintReviews.PreprintReviews, { getPreprintReview: () => Effect.succeed(prereview) }),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )

  it.effect.prop(
    "when the Slack can't be notified",
    [
      fc.integer(),
      fc.origin(),
      fc.prereview(),
      fc.anything().map(cause => new CommunitySlack.FailedToSharePreprintReview({ cause })),
    ],
    ([preprintReviewId, publicUrl, prereview, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.result)

        expect(actual).toStrictEqual(Result.fail(new PreprintReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReview: () => error }),
          Layer.mock(PreprintReviews.PreprintReviews, { getPreprintReview: () => Effect.succeed(prereview) }),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )

  it.effect.prop(
    "when the published review can't be loaded",
    [
      fc.integer(),
      fc.origin(),
      fc.constantFrom(
        new PreprintReviews.PrereviewIsNotFound(),
        new PreprintReviews.PrereviewIsUnavailable({}),
        new PreprintReviews.PrereviewWasRemoved(),
      ),
    ],
    ([preprintReviewId, publicUrl, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyCommunitySlack(preprintReviewId), Effect.result)

        expect(actual).toStrictEqual(Result.fail(new PreprintReviews.FailedToNotifyCommunitySlack({})))
      }).pipe(
        Effect.provide([
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(PreprintReviews.PreprintReviews, { getPreprintReview: () => error }),
          Layer.succeed(PublicUrl, publicUrl),
        ]),
      ),
  )
})
