import { HttpClient, type UrlParams } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { ContentfulConfig } from '../ContentfulConfig.ts'
import { ContentfulIsUnavailable, type EntryIsNotFound } from '../Errors.ts'
import type { ContentfulId, Entry } from '../Types.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetEntry = (
  id: ContentfulId,
  params?: UrlParams.Input,
): Effect.Effect<Entry, EntryIsNotFound | ContentfulIsUnavailable, ContentfulConfig | HttpClient.HttpClient> =>
  pipe(
    CreateRequest(id, params),
    Effect.andThen(HttpClient.execute),
    Effect.catchTag('RequestError', 'ResponseError', error => new ContentfulIsUnavailable({ cause: error })),
    Effect.andThen(HandleResponse),
    Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to get entries from Contentful'), { error })),
    Effect.withSpan('Contentful.getEntry', { attributes: { id } }),
  )
