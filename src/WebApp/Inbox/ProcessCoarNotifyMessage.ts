import { Effect, Either, pipe } from 'effect'
import type { CoarNotify } from '../../ExternalApis/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as ReviewRequests from '../../ReviewRequests/index.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
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
    const preprintId = yield* pipe(
      Either.fromOption(
        Preprints.parsePreprintDoi(message.object['ietf:cite-as']),
        () => new Preprints.NotAPreprint({}),
      ),
      Effect.andThen(Preprints.resolvePreprintId),
    )

    const acceptedAt = yield* Temporal.currentInstant

    yield* ReviewRequests.receiveReviewRequest({
      receivedAt,
      preprintId,
      reviewRequestId: messageId,
      requester: {
        name: message.actor.name,
      },
    })
    yield* ReviewRequests.acceptReviewRequest({
      receivedAt,
      acceptedAt,
      preprintId,
      reviewRequestId: messageId,
      requester: {
        name: message.actor.name,
      },
    })
  },
  Effect.catchTags({
    NotAPreprint: error => new Errors.RejectedRequestReview({ cause: error }),
    PreprintIsNotFound: error => new Errors.FailedToProcessRequestReview({ cause: error }),
    PreprintIsUnavailable: error => new Errors.FailedToProcessRequestReview({ cause: error }),
    UnableToHandleCommand: error => new Errors.FailedToProcessRequestReview({ cause: error }),
  }),
)
