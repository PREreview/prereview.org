import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import { CreateRequest } from './CreateRequest.js'
import { HandleResponse } from './HandleResponse.js'

export const GetEprint = flow(CreateRequest, HttpClient.execute, Effect.andThen(HandleResponse))
