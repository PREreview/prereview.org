import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export type { ChatPostMessageInput } from './ChatPostMessageInput.ts'

export const ChatPostMessage = flow(CreateRequest, Effect.andThen(HttpClient.execute), Effect.andThen(HandleResponse))
