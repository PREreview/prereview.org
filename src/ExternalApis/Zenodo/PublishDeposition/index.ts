import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const PublishDeposition = flow(CreateRequest, Effect.andThen(HttpClient.execute), Effect.andThen(HandleResponse))
