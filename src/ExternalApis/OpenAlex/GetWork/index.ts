import { HttpClient } from '@effect/platform'
import { Effect, flow } from 'effect'
import type { Doi } from '../../../types/index.ts'
import { type Work, type WorkIsNotFound, WorkIsUnavailable } from '../Work.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetWork: (doi: Doi.Doi) => Effect.Effect<Work, WorkIsNotFound | WorkIsUnavailable, HttpClient.HttpClient> =
  flow(
    CreateRequest,
    HttpClient.execute,
    Effect.andThen(HandleResponse),
    Effect.catchTag('RequestError', 'ResponseError', error => new WorkIsUnavailable({ cause: error })),
    Effect.tapErrorTag('WorkIsUnavailable', error =>
      Effect.logError('Failed to get work from OpenAlex').pipe(Effect.annotateLogs({ error })),
    ),
  )
