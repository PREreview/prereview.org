import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { SlackApi } from '../SlackApi.ts'
import { ChatPostMessageInput } from './ChatPostMessageInput.ts'

export const CreateRequest = Effect.fn(function* (message: ChatPostMessageInput) {
  const api = yield* SlackApi

  return yield* pipe(
    HttpClientRequest.post('https://slack.com/api/chat.postMessage'),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.apiToken),
    HttpClientRequest.schemaBodyJson(ChatPostMessageInput)(message),
  )
})
