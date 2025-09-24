import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Eprint } from '../Eprint.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Eprint)),
)
