import { HttpClientResponse } from 'effect/http'
import { Effect, Equal, flow, Match } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import {
  PersonalDetails,
  PersonalDetailsAreInaccessible,
  PersonalDetailsAreNotFound,
  PersonalDetailsAreUnavailable,
} from '../PersonalDetails.ts'

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(PersonalDetails)),
  Effect.mapError(
    flow(
      Match.value,
      Match.when(
        { response: { status: StatusCodes.NotFound } },
        error => new PersonalDetailsAreNotFound({ cause: error }),
      ),
      Match.when(
        { response: { status: StatusCodes.Conflict } },
        error => new PersonalDetailsAreInaccessible({ cause: error }),
      ),
      Match.orElse(error => new PersonalDetailsAreUnavailable({ cause: error })),
    ),
  ),
)
