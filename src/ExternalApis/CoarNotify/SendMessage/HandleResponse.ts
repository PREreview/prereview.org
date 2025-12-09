import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow, Predicate } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Predicate.or(Equal.equals(StatusCodes.Created), Equal.equals(StatusCodes.Accepted))),
  Effect.asVoid,
)
