import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Effect, Either, Layer, pipe } from 'effect'
import { CommunitySlack } from '../../../src/ExternalInteractions/index.ts'
import * as Preprints from '../../../src/Preprints/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as _ from '../../../src/ReviewRequests/Reactions/NotifyCommunitySlack.ts'
import * as EffectTest from '../../EffectTest.ts'
import * as fc from '../../fc.ts'

describe('NotifyCommunitySlack', () => {
  test.prop([
    fc.uuid(),
    fc.publishedReviewRequest(),
    fc.preprint(),
    fc.record({ channelId: fc.slackChannelId(), messageTimestamp: fc.slackTimestamp() }),
  ])('when the request can be shared', (reviewRequestId, reviewRequest, preprint, response) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.void)
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => Effect.succeed(response) }),
          Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
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
    fc.preprint(),
    fc.anything().map(cause => new CommunitySlack.FailedToSharePreprintReviewRequest({ cause })),
  ])("when the request can't be shared", (reviewRequestId, reviewRequest, preprint, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, { sharePreprintReviewRequest: () => error }),
          Layer.mock(Preprints.Preprints, { getPreprint: () => Effect.succeed(preprint) }),
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
    fc
      .anything()
      .chain(cause =>
        fc.constantFrom(new Preprints.PreprintIsNotFound({ cause }), new Preprints.PreprintIsUnavailable({ cause })),
      ),
  ])("when the preprint can't be loaded", (reviewRequestId, reviewRequest, error) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({ cause: error })))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Preprints.Preprints, { getPreprint: () => error }),
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
      const actual = yield* pipe(_.NotifyCommunitySlack(reviewRequestId), Effect.either)

      expect(actual).toStrictEqual(Either.left(new ReviewRequests.FailedToNotifyCommunitySlack({})))
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.mock(CommunitySlack.CommunitySlack, {}),
          Layer.mock(Preprints.Preprints, {}),
          Layer.mock(ReviewRequests.ReviewRequestQueries, { getPublishedReviewRequest: () => error }),
        ),
      ),
      EffectTest.run,
    ),
  )
})
