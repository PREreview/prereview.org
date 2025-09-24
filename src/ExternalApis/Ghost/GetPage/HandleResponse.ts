import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow, Match, Schema, Tuple } from 'effect'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Page } from '../Page.ts'
import { GhostPageNotFound, GhostPageUnavailable } from './Errors.ts'

const ResponseSchema = Schema.transform(Schema.Struct({ pages: Schema.Tuple(Page) }), Schema.typeSchema(Page), {
  strict: true,
  decode: input => input.pages[0],
  encode: page => ({ pages: Tuple.make(page) }),
})

export const HandleResponse = flow(
  HttpClientResponse.filterStatus(Equal.equals(StatusCodes.OK)),
  Effect.andThen(HttpClientResponse.schemaBodyJson(ResponseSchema)),
  Effect.mapError(
    flow(
      Match.value,
      Match.when({ response: { status: StatusCodes.NotFound } }, error => new GhostPageNotFound({ cause: error })),
      Match.orElse(error => new GhostPageUnavailable({ cause: error })),
    ),
  ),
)
