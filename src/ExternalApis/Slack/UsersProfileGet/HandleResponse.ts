import { HttpClientResponse } from '@effect/platform'
import { Effect, flow, Schema, Struct } from 'effect'
import { Response, SlackError } from '../Types.ts'
import { UsersProfileGetResponse } from './UsersProfileGetResponse.ts'

export const HandleResponse = flow(
  HttpClientResponse.schemaBodyJson(Response(Schema.Struct({ profile: UsersProfileGetResponse }))),
  Effect.filterOrElse(
    response => response.ok,
    error => new SlackError({ message: error.error }),
  ),
  Effect.andThen(Struct.get('profile')),
)
