import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { CoarNotify } from '../../ExternalApis/index.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { Temporal, Uuid } from '../../types/index.ts'
import { ProcessCoarNotifyMessage } from './ProcessCoarNotifyMessage.ts'

export const Inbox = Effect.gen(function* () {
  const message = yield* HttpServerRequest.schemaBodyJson(CoarNotify.RequestReviewSchema)
  const receivedAt = yield* Temporal.currentInstant
  const messageId = yield* Uuid.v4()

  yield* ProcessCoarNotifyMessage({ message, receivedAt, messageId })

  return yield* HttpServerResponse.empty({ status: StatusCodes.Accepted })
}).pipe(
  Effect.catchTags({
    ParseError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
    RequestError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
    RejectedRequestReview: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
    FailedToProcessRequestReview: () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
  }),
)
