import { Array, Effect } from 'effect'
import { CommunitySlack } from '../../ExternalInteractions/index.ts'
import * as Prereviews from '../../Prereviews/index.ts'
import * as PublicUrl from '../../public-url.ts'
import * as Routes from '../../routes.ts'
import * as Errors from '../Errors.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (reviewId: number) {
    const prereview = yield* Prereviews.getPrereview(reviewId)

    const author = Array.headNonEmpty(prereview.authors.named).name
    const url = yield* PublicUrl.forRoute(Routes.reviewMatch.formatter, { id: prereview.id })

    yield* CommunitySlack.sharePreprintReview({ author, url })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)
