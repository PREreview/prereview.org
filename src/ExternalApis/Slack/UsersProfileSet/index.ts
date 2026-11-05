import { HttpClient } from 'effect/http'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export type { UsersProfileSetInput } from './UsersProfileSetInput.ts'

export const UsersProfileSet = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.withSpan('Slack.usersProfileSet'),
)
