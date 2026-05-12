import { describe, expect, it, vi } from '@effect/vitest'
import { Effect, Either, HashSet, Layer, pipe } from 'effect'
import { Email } from '../../../src/ExternalInteractions/index.ts'
import * as PreprintReviews from '../../../src/PreprintReviews/index.ts'
import * as _ from '../../../src/PreprintReviews/Workflows/NotifyReviewRequestersOfReview.ts'
import * as Prereviewers from '../../../src/Prereviewers/index.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as ReviewRequests from '../../../src/ReviewRequests/index.ts'
import * as fc from '../../fc.ts'

describe('NotifyReviewRequestersOfReview', () => {
  describe('when the review can be loaded', () => {
    describe('when there are requesters needing to be notified', () => {
      it.effect.prop(
        'sends an email',
        [
          fc.integer(),
          fc.prereview({ preprintId: fc.coarNotifyTargetPreprintId() }),
          fc.hashSet(fc.orcidId(), { minLength: 1 }),
          fc.record({
            name: fc.nonEmptyString(),
            email: fc.emailAddress(),
          }),
        ],
        ([reviewId, review, requesters, contactDetails]) =>
          Effect.gen(function* () {
            const getContactDetails = vi.fn<(typeof Prereviewers.Prereviewers.Service)['getContactDetails']>(_ =>
              Effect.succeed(contactDetails),
            )
            const notifyRequesterOfReview = vi.fn<(typeof Email.Email.Service)['notifyRequesterOfReview']>(
              _ => Effect.void,
            )
            const recordEmailSentToNotifyPrereviewerOfAPrereview = vi.fn<
              (typeof PreprintReviews.PreprintReviews.Service)['recordEmailSentToNotifyPrereviewerOfAPrereview']
            >(_ => Effect.void)

            const actual = yield* pipe(
              _.NotifyReviewRequestersOfReview(reviewId),
              Effect.provide([
                Layer.mock(Email.Email, { notifyRequesterOfReview }),
                Layer.mock(PreprintReviews.PreprintReviews, {
                  hasAPrereviewerBeenNotifiedOfAReview: () => Effect.succeed(false),
                  recordEmailSentToNotifyPrereviewerOfAPrereview,
                }),
                Layer.mock(Prereviewers.Prereviewers, { getContactDetails }),
              ]),
              Effect.either,
            )

            expect(actual).toStrictEqual(Either.void)
            expect(getContactDetails).toHaveBeenCalledTimes(HashSet.size(requesters))
            expect(notifyRequesterOfReview).toHaveBeenCalledTimes(HashSet.size(requesters))
            expect(recordEmailSentToNotifyPrereviewerOfAPrereview).toHaveBeenCalledTimes(HashSet.size(requesters))
          }).pipe(
            Effect.provide([
              Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
              Layer.mock(ReviewRequests.ReviewRequestQueries, {
                listPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint: () => Effect.succeed(requesters),
              }),
            ]),
          ),
      )
    })

    it.effect.prop(
      'when there are no requesters needing to be notified',
      [fc.integer(), fc.prereview({ preprintId: fc.coarNotifyTargetPreprintId() }), fc.hashSet(fc.orcidId())],
      ([reviewId, review, requesters]) =>
        Effect.gen(function* () {
          const actual = yield* pipe(_.NotifyReviewRequestersOfReview(reviewId), Effect.either)

          expect(actual).toStrictEqual(Either.void)
        }).pipe(
          Effect.provide([
            Layer.mock(Email.Email, {}),
            Layer.mock(PreprintReviews.PreprintReviews, {
              hasAPrereviewerBeenNotifiedOfAReview: () => Effect.succeed(true),
            }),
            Layer.mock(Prereviewers.Prereviewers, {}),
            Layer.mock(Prereviews.Prereviews, { getPrereview: () => Effect.succeed(review) }),
            Layer.mock(ReviewRequests.ReviewRequestQueries, {
              listPrereviewersWhoHaveOptedInToNotificationsForReviewsOfAPreprint: () => Effect.succeed(requesters),
            }),
          ]),
        ),
    )
  })

  it.effect.prop(
    "when the review can't be loaded",
    [
      fc.integer(),
      fc.constantFrom(
        new Prereviews.PrereviewIsNotFound(),
        new Prereviews.PrereviewIsUnavailable(),
        new Prereviews.PrereviewWasRemoved(),
      ),
    ],
    ([reviewId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(_.NotifyReviewRequestersOfReview(reviewId), Effect.either)

        expect(actual).toStrictEqual(Either.left(new PreprintReviews.FailedToNotifyReviewRequesters({ cause: error })))
      }).pipe(
        Effect.provide([
          Layer.mock(Email.Email, {}),
          Layer.mock(PreprintReviews.PreprintReviews, {}),
          Layer.mock(Prereviewers.Prereviewers, {}),
          Layer.mock(Prereviews.Prereviews, { getPrereview: () => error }),
          Layer.mock(ReviewRequests.ReviewRequestQueries, {}),
        ]),
      ),
  )
})
