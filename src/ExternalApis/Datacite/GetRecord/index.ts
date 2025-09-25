import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import * as Record from '../Record.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetRecord = flow(
  CreateRequest,
  HttpClient.execute,
  Effect.andThen(HandleResponse),
  Effect.catchTag('RequestError', 'ResponseError', error => new Record.RecordIsUnavailable({ cause: error })),
  Effect.tapErrorTag('RecordIsUnavailable', error =>
    Effect.logError('Failed to get record from DataCite').pipe(Effect.annotateLogs({ error })),
  ),
)
