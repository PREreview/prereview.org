import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { SubmittedDeposition } from '../Deposition.js'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.ACCEPTED)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(SubmittedDeposition)),
)
