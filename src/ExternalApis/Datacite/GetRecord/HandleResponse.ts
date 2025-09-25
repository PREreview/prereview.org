import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow, Match } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import * as Record from '../Record.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(Record.ResponseSchema(Record.Record))),
  Effect.mapError(
    flow(
      Match.value,
      Match.when(
        { response: { status: StatusCodes.NotFound } },
        error => new Record.RecordIsNotFound({ cause: error }),
      ),
      Match.orElse(error => new Record.RecordIsUnavailable({ cause: error })),
    ),
  ),
)
