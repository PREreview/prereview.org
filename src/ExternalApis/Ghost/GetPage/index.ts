import { HttpClient } from 'effect/http'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { GhostPageUnavailable } from './Errors.ts'
import { HandleResponse } from './HandleResponse.ts'

export * from './Errors.ts'

export const GetPage = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.catchTag('HttpClientError', error => new GhostPageUnavailable({ cause: error })),
  Effect.withSpan('Ghost.getPage'),
)
