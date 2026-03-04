import { Effect, Match, Option, pipe, Struct } from 'effect'
import { CommunitySlack } from '../../ExternalInteractions/index.ts'
import * as Personas from '../../Personas/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import type { Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const NotifyCommunitySlack = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getPublishedReviewRequest({ reviewRequestId })

    const author = yield* Match.valueTags(reviewRequest, {
      PublishedReceivedReviewRequest: reviewRequest =>
        Effect.succeed(Option.map(reviewRequest.author, Struct.get('name'))),
      PublishedPrereviewerReviewRequest: reviewRequest =>
        pipe(
          Personas.getPersona(reviewRequest.author),
          Effect.andThen(
            Personas.match({
              onPublic: Struct.get('name'),
              onPseudonym: Struct.get('pseudonym'),
            }),
          ),
          Effect.asSome,
        ),
    })

    const preprint = yield* Preprints.getPreprint(reviewRequest.preprintId)

    const message = yield* CommunitySlack.sharePreprintReviewRequest({ author, preprint })

    yield* Commands.recordReviewRequestSharedOnTheCommunitySlack({
      channelId: message.channelId,
      messageTimestamp: message.messageTimestamp,
      reviewRequestId: reviewRequest.id,
    })
  },
  Effect.catchAll(error => new Errors.FailedToNotifyCommunitySlack({ cause: error })),
  Effect.scoped,
)
