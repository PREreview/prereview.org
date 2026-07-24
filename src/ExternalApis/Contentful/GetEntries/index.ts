import { HttpClient, type UrlParams } from '@effect/platform'
import { Effect, flow } from 'effect'
import type { ContentfulConfig } from '../ContentfulConfig.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import type { Entries } from '../Types.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetEntries: (
  params?: UrlParams.Input,
) => Effect.Effect<Entries, ContentfulIsUnavailable, ContentfulConfig | HttpClient.HttpClient> = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.catchTag('RequestError', 'ResponseError', error => new ContentfulIsUnavailable({ cause: error })),
  Effect.andThen(HandleResponse),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to get entries from Contentful'), { error })),
  Effect.withSpan('Contentful.getEntries'),
)
