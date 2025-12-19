import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { SlackApi } from '../SlackApi.ts'
import type { UserId } from '../Types.js'

export const CreateRequest = Effect.fn(function* (userId: UserId) {
  const api = yield* SlackApi

  return pipe(
    HttpClientRequest.get('https://slack.com/api/users.profile.get', { urlParams: { user: userId } }),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.apiToken),
  )
})
