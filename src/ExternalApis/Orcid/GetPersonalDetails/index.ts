import { HttpClient } from 'effect/http'
import { Effect, flow } from 'effect'
import { PersonalDetailsAreUnavailable } from '../PersonalDetails.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetPersonalDetails = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.catchTag('HttpClientError', error => new PersonalDetailsAreUnavailable({ cause: error })),
)
