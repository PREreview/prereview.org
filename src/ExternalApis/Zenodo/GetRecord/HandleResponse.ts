import { Effect, Equal, flow } from 'effect'
import { HttpClientResponse } from 'effect/http'
import * as StatusCodes from '../../../StatusCodes.ts'
import { PublishedRecord } from '../PublishedRecord.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(PublishedRecord)),
)
