import { Effect, Either } from 'effect'
import type { CoarNotify } from '../../ExternalApis/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import type { Temporal, Uuid } from '../../types/index.ts'
import { ActorToRequester } from './ActorToRequester.ts'
import * as Errors from './Errors.ts'

export const ProcessCoarNotifyMessage = Effect.fn(
  function* ({
    message,
    messageId,
    receivedAt,
  }: {
    message: CoarNotify.RequestReview
    messageId: Uuid.Uuid
    receivedAt: Temporal.Instant
  }) {
    const preprintId = yield* Either.fromOption(
      Preprints.parsePreprintDoi(message.object['ietf:cite-as']),
      () => new Preprints.NotAPreprint({ cause: `failed to parse as preprint Doi: ${message.object['ietf:cite-as']}` }),
    )

    yield* ReviewRequests.receiveReviewRequest({
      receivedAt,
      receivedFrom: message.origin.id,
      preprintId,
      reviewRequestId: messageId,
      requester: ActorToRequester(message.actor),
    })
  },
  Effect.catchTags({
    NotAPreprint: error => new Errors.RejectedRequestReview({ cause: error }),
    UnableToHandleCommand: error => new Errors.FailedToProcessRequestReview({ cause: error }),
  }),
)
