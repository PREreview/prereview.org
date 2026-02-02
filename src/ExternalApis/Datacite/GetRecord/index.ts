import { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { Doi } from '../../../types/index.ts'
import * as Record from '../Record.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetRecord = (doi: Doi.Doi) =>
  pipe(
    CreateRequest(doi),
    HttpClient.execute,
    Effect.andThen(HandleResponse),
    Effect.catchTag('RequestError', 'ResponseError', error => new Record.RecordIsUnavailable({ cause: error })),
    Effect.tapErrorTag('RecordIsUnavailable', error =>
      Effect.logError('Failed to get record from DataCite').pipe(Effect.annotateLogs({ error })),
    ),
    Effect.withSpan('Datacite.getRecord', { attributes: { doi } }),
  )
