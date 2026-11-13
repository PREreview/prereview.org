import { Array, Boolean, Effect, Option, pipe } from 'effect'
import { Email } from '../../../ExternalInteractions/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import * as Prereviews from '../../../Prereviews/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { Temporal } from '../../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as PreprintReviews from '../PreprintReviews.ts'

export const NotifyReviewRequestersOfReview = Effect.fn('PreprintReviews.notifyReviewRequestersOfReview')(
  function* (reviewId: number) {
    const prereview = yield* Prereviews.getPreprintReview(reviewId)

    const requestersNeedingNotification = yield* pipe(
      ReviewRequests.listPrereviewersWhoRequestedReviewsOfAPreprintAndHaveOptedInToNotifications(prereview.preprint.id),
      Effect.andThen(
        Effect.filter(
          requester =>
            Effect.map(
              PreprintReviews.hasAPrereviewerBeenNotifiedOfAReview({ prereviewId: prereview.id, orcidId: requester }),
              Boolean.not,
            ),
          { concurrency: 'unbounded' },
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
            author: Option.some(Array.headNonEmpty(prereview.authors.named).name),
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
      { concurrency: 'unbounded', discard: true },
    )
  },
  Effect.catch(error => new Errors.FailedToNotifyReviewRequesters({ cause: error })),
)
