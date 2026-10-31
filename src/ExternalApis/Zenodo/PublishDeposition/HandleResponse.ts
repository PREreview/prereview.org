import { HttpClientResponse } from 'effect/http'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { SubmittedDeposition } from '../Deposition.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Accepted)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(SubmittedDeposition)),
)
