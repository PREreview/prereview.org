import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { ContentfulIsUnavailable, EntryIsNotFound } from '../Errors.ts'
import { Entry } from '../Types.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Entry)),
  Effect.catchIf(
    error => error._tag === 'ResponseError' && error.response.status === StatusCodes.NotFound,
    error => new EntryIsNotFound({ cause: error }),
  ),
  Effect.catchTag('ResponseError', 'ParseError', error => new ContentfulIsUnavailable({ cause: error })),
)
