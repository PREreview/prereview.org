import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.js'
import { UnsubmittedDeposition } from '../Deposition.js'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Created)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(UnsubmittedDeposition)),
)
