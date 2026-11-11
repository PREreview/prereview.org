import { HttpClient, type UrlParams } from 'effect/http'
import { Effect, flow } from 'effect'
import type { ContentfulConfig } from '../ContentfulConfig.ts'
import { ContentfulIsUnavailable } from '../Errors.ts'
import type { Assets } from '../Types.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const GetAssets: (
  params?: UrlParams.Input,
) => Effect.Effect<Assets, ContentfulIsUnavailable, ContentfulConfig | HttpClient.HttpClient> = flow(
  CreateRequest,
  Effect.andThen(HttpClient.execute),
  Effect.catchTag('HttpClientError', error => new ContentfulIsUnavailable({ cause: error })),
  Effect.andThen(HandleResponse),
  Effect.tapError(error => Effect.annotateLogs(Effect.logError('Failed to get assets from Contentful'), { error })),
  Effect.withSpan('Contentful.getAssets'),
)
