import { HttpClientResponse } from '@effect/platform'
import { Effect, Equal, flow } from 'effect'
import { StatusCodes } from 'http-status-codes'

export const HandleResponse = flow(HttpClientResponse.filterStatus(Equal.equals(StatusCodes.CREATED)), Effect.asVoid)
