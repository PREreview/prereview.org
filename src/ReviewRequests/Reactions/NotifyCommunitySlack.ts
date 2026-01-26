import { Effect, Option, Struct } from 'effect'
import { CommunitySlack } from '../../ExternalInteractions/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getPublishedReviewRequest({ reviewRequestId })

    const preprint = yield* Preprints.getPreprint(reviewRequest.preprintId)

    const message = yield* CommunitySlack.sharePreprintReviewRequest({
      author: Option.map(reviewRequest.author, Struct.get('name')),
      preprint,
    })

    yield* Commands.recordReviewRequestSharedOnTheCommunitySlack({
      channelId: message.channelId,
      messageTimestamp: message.messageTimestamp,
      reviewRequestId: reviewRequest.id,
    })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
  Effect.scoped,
)
