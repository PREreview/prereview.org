import { Effect, Equal, flow } from 'effect'
import { HttpClientResponse } from 'effect/http'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Draft } from '../Draft.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Created)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Draft)),
)
