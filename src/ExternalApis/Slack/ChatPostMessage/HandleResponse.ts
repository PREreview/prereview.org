import { type HttpClientError, HttpClientResponse } from '@effect/platform'
import { Effect, flow } from 'effect'
import { Response, SlackError } from '../Types.ts'

export const HandleResponse = flow(
  HttpClientResponse.schemaBodyJson(Response)<HttpClientError.ResponseError>,
  Effect.filterOrElse(
    response => response.ok,
    error => new SlackError({ message: error.error }),
  ),
  Effect.asVoid,
)
