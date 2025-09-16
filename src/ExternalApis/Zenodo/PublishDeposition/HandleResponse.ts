import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.js'
import { SubmittedDeposition } from '../Deposition.js'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Accepted)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(SubmittedDeposition)),
)
