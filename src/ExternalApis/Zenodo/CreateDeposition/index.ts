import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.js'
import { HandleResponse } from './HandleResponse.js'

export const CreateDeposition = flow(CreateRequest, Effect.andThen(HttpClient.execute), Effect.andThen(HandleResponse))
