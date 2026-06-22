import { Array, Effect, pipe } from 'effect'
import { Email } from '../../ExternalInteractions/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { Temporal } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as PreprintReviews from '../PreprintReviews.ts'

export const NotifyReviewRequestersOfReview = Effect.fn(
  function* (reviewId: number) {
    const prereview = yield* Prereviews.getPrereview(reviewId)

    const requestersNeedingNotification = yield* pipe(
      ReviewRequests.listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications(prereview.preprint.id),
      Effect.andThen(
        Effect.filter(
          requester =>
            PreprintReviews.hasAPrereviewerBeenNotifiedOfAReview({ prereviewId: prereview.id, orcidId: requester }),
          { concurrency: 'inherit', negate: true },
        ),
      ),
    )

    yield* Effect.forEach(
      requestersNeedingNotification,
      Effect.fnUntraced(function* (orcidId) {
        const requester = yield* Prereviewers.getContactDetails(orcidId)

        yield* Email.notifyRequesterOfReview({
          requester: {
            name: requester.name,
            emailAddress: requester.email,
          },
          review: {
            author: Array.headNonEmpty(prereview.authors.named).name,
            id: prereview.id,
            preprint: prereview.preprint,
          },
        })

        yield* PreprintReviews.recordEmailSentToNotifyPrereviewerOfAPrereview({
          orcidId,
          prereviewId: prereview.id,
          sentAt: yield* Temporal.currentInstant,
        })
      }, Effect.uninterruptible),
      { concurrency: 'inherit', discard: true },
    )
  },
  Effect.catchAll(error => new Errors.FailedToNotifyReviewRequesters({ cause: error })),
)
