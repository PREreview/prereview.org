import { HttpClient } from 'effect/http'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export type { ChatDeleteInput } from './ChatDeleteInput.ts'

export const ChatDelete = flow(CreateRequest, Effect.andThen(HttpClient.execute), Effect.andThen(HandleResponse))
