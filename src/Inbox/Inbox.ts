import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { CoarNotify } from '../ExternalApis/index.ts'
import * as StatusCodes from '../StatusCodes.ts'
import { Temporal, Uuid } from '../types/index.ts'
import { ProcessCoarNotifyMessage } from './Workflow.ts'

export const Inbox = Effect.gen(function* () {
  const message = yield* HttpServerRequest.schemaBodyJson(CoarNotify.RequestReviewSchema)
  const receivedAt = yield* Temporal.currentInstant
  const messageId = yield* Uuid.generateUuid

  yield* ProcessCoarNotifyMessage.execute({ message, receivedAt, messageId }, { discard: true })

  return yield* HttpServerResponse.empty({ status: StatusCodes.Created })
}).pipe(
  Effect.catchTags({
    ParseError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
    RequestError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
  }),
)
