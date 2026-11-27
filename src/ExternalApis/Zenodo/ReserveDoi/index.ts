import { Effect, flow } from 'effect'
import { HttpClient } from 'effect/http'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const ReserveDoi = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.andThen(HandleResponse),
  Effect.withSpan('Zenodo.reserveDoi'),
)
