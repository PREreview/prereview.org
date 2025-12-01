import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { SlackApi } from '../SlackApi.ts'
import { ChatDeleteInput } from './ChatDeleteInput.ts'

export const CreateRequest = Effect.fn(function* (input: ChatDeleteInput) {
  const api = yield* SlackApi

  return yield* pipe(
    HttpClientRequest.post('https://slack.com/api/chat.delete'),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.apiToken),
    HttpClientRequest.schemaBodyJson(ChatDeleteInput)(input),
  )
})
