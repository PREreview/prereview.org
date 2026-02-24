import { HttpClient } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { DetectLanguageIsUnavailable } from '../DetectLanguageApi.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const Detect = (text: string) =>
  pipe(
    CreateRequest(text),
    HttpClient.execute,
    Effect.catchTag('RequestError', error => new DetectLanguageIsUnavailable({ cause: error })),
    Effect.andThen(HandleResponse),
    Effect.tapError(error =>
      Effect.logError('Failed to detect language through Detect Language API').pipe(Effect.annotateLogs({ error })),
    ),
    Effect.withSpan('DetectLanguage.detect', { attributes: { text } }),
  )
