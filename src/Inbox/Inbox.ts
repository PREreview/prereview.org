import { HttpServerRequest, HttpServerResponse } from '@effect/platform'
import { Effect } from 'effect'
import { CoarNotify } from '../ExternalApis/index.ts'
import * as StatusCodes from '../StatusCodes.ts'

export const Inbox = Effect.gen(function* () {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const message = yield* HttpServerRequest.schemaBodyJson(CoarNotify.RequestReviewSchema)

  return yield* HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable })
}).pipe(
  Effect.catchTags({
    ParseError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
    RequestError: () => HttpServerResponse.empty({ status: StatusCodes.BadRequest }),
  }),
)
