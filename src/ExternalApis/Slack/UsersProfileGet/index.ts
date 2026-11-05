import { HttpClient } from 'effect/http'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export type { UsersProfileGetResponse } from './UsersProfileGetResponse.ts'

export const UsersProfileGet = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.withSpan('Slack.usersProfileGet'),
)
