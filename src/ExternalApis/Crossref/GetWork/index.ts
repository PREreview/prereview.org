import { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { Doi } from '../../../types/index.ts'
import { type Work, type WorkIsNotFound, WorkIsUnavailable } from '../Work.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetWork = (doi: Doi.Doi): Effect.Effect<Work, WorkIsNotFound | WorkIsUnavailable, HttpClient.HttpClient> =>
  pipe(
    CreateRequest(doi),
    HttpClient.execute,
    Effect.andThen(HandleResponse),
    Effect.catchTag('RequestError', 'ResponseError', error => new WorkIsUnavailable({ cause: error })),
    Effect.tapErrorTag('WorkIsUnavailable', error =>
      Effect.logError('Failed to get work from Crossref').pipe(Effect.annotateLogs({ error })),
    ),
    Effect.withSpan('Crossref.GetWork', { attributes: { doi } }),
  )
