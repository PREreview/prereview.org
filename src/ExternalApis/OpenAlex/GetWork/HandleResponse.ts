import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow, Match } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import * as Work from '../Work.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Work.WorkSchema)),
  Effect.mapError(
    flow(
      Match.value,
      Match.when({ response: { status: StatusCodes.Gone } }, error => new Work.WorkIsNotFound({ cause: error })),
      Match.when({ response: { status: StatusCodes.NotFound } }, error => new Work.WorkIsNotFound({ cause: error })),
      Match.orElse(error => new Work.WorkIsUnavailable({ cause: error })),
    ),
  ),
)
