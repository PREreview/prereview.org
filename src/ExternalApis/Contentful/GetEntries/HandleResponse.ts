import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import { Entries } from '../Types.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Entries)),
  Effect.catchTag('ResponseError', 'ParseError', error => new ContentfulIsUnavailable({ cause: error })),
)
