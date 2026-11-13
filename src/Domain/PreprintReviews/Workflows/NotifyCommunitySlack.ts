import { Array, Effect } from 'effect'
import { CommunitySlack } from '../../../ExternalInteractions/index.ts'
import * as PreprintReviews from '../PreprintReviews.ts'
import * as PublicUrl from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import * as Errors from '../Errors.ts'

export const NotifyCommunitySlack = Effect.fn('PreprintReviews.notifyCommunitySlack')(
  function* (reviewId: number) {
    const prereview = yield* PreprintReviews.getPreprintReview(reviewId)

    const author = Array.headNonEmpty(prereview.authors.named).name
    const url = yield* PublicUrl.forRoute(Routes.reviewMatch.formatter, { id: prereview.id })

    yield* CommunitySlack.sharePreprintReview({ author, url })
  },
  Effect.catch(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)
