import { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetEprint = (eprintId: number) =>
  pipe(
    CreateRequest(eprintId),
    HttpClient.execute,
    Effect.andThen(HandleResponse),
    Effect.withSpan('Philsci.getEprint', { attributes: { eprintId } }),
  )
