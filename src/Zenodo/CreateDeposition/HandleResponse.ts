import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { UnsubmittedDeposition } from '../Deposition.js'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.CREATED)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(UnsubmittedDeposition)),
)
