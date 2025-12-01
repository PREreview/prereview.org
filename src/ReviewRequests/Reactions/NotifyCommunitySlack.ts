import { Effect } from 'effect'
import { CommunitySlack } from '../../ExternalInteractions/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getPublishedReviewRequest({ reviewRequestId })

    const preprint = yield* Preprints.getPreprint(reviewRequest.preprintId)

    yield* CommunitySlack.sharePreprintReviewRequest({ author: reviewRequest.author.name, preprint })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
)
