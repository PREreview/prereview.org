import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { UnsubmittedDeposition } from '../Deposition.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.Created)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(UnsubmittedDeposition)),
)
