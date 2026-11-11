import { HttpClientResponse } from 'effect/http'
import { Effect, Equal, flow, Option } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import { ContentfulErrorResponse, Entries } from '../Types.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Entries)),
  Effect.catchTag(
    'HttpClientError',
    Effect.fnUntraced(function* (error) {
      if (error.reason._tag !== 'StatusCodeError') {
        return yield* new ContentfulIsUnavailable({ cause: error })
      }

      const response = yield* Effect.option(
        HttpClientResponse.schemaBodyJson(ContentfulErrorResponse)(error.reason.response),
      )

      return yield* new ContentfulIsUnavailable({ cause: error, response: Option.getOrUndefined(response) })
    }),
  ),
  Effect.catchTag('SchemaError', error => new ContentfulIsUnavailable({ cause: error })),
)
