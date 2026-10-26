import { HttpClientResponse } from '@effect/platform'
import { Effect, flow, Struct } from 'effect'
import { Response, SlackError } from '../Types.ts'
import { ChatDeleteResponse } from './ChatDeleteResponse.ts'

export const HandleResponse = flow(
  HttpClientResponse.schemaBodyJson(Response(ChatDeleteResponse)),
  Effect.filterOrElse(
    response => response.ok,
    error => new SlackError({ message: error.error }),
  ),
  Effect.map(Struct.omit('ok')),
)
