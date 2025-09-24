import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetEprint = flow(CreateRequest, HttpClient.execute, Effect.andThen(HandleResponse))
