import { HttpClientResponse } from 'effect/http'
import { Effect, flow, Schema } from 'effect'
import { Response, SlackError } from '../Types.ts'

export const HandleResponse = flow(
  HttpClientResponse.schemaBodyJson(Response(Schema.Struct({}))),
  Effect.filterOrElse(
    response => response.ok,
    error => new SlackError({ message: error.error }),
  ),
  Effect.asVoid,
)
