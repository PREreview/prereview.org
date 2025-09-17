import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.js'
import { GhostPageUnavailable } from './Errors.js'
import { HandleResponse } from './HandleResponse.js'

export * from './Errors.js'

export const GetPage = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.catchTag('RequestError', 'ResponseError', error => new GhostPageUnavailable({ cause: error })),
)
