import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { PersonalDetailsAreUnavailable } from '../PersonalDetails.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetPersonalDetails = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.catchTag('RequestError', 'ResponseError', error => new PersonalDetailsAreUnavailable({ cause: error })),
)
