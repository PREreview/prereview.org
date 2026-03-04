import { Effect } from 'effect'
import { Email } from '../../ExternalInteractions/index.ts'
import { Temporal, type Uuid } from '../../types/index.ts'
import * as Commands from '../Commands/index.ts'
import * as Errors from '../Errors.ts'
import * as Queries from '../Queries/index.ts'

export const AcknowledgeReviewRequest = Effect.fn(
  function* (reviewRequestId: Uuid.Uuid) {
    const reviewRequest = yield* Queries.getReviewRequestToAcknowledge({ reviewRequestId })

    yield* Email.acknowledgeReviewRequest(reviewRequest)

    const sentAt = yield* Temporal.currentInstant

    yield* Commands.recordEmailSentToAcknowledgeReviewRequest({ sentAt, reviewRequestId })
  },
  Effect.catchTag('ReviewRequestCannotBeAcknowledged', 'ReviewRequestWasAlreadyAcknowledged', () => Effect.void),
  Effect.catchAll(error => new Errors.FailedToAcknowledgeReviewRequest({ cause: error })),
  Effect.scoped,
)
