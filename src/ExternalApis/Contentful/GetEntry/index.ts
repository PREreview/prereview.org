import type { HttpClient, UrlParams } from '@effect/platform'
import type { Effect } from 'effect'
import type { ContentfulConfig } from '../ContentfulConfig.ts'
import type { ContentfulIsUnavailable, EntryIsNotFound } from '../Errors.ts'
import type { ContentfulId, Entry } from '../Types.ts'

export declare const GetEntry: (
  id: ContentfulId,
  params?: UrlParams.Input,
) => Effect.Effect<Entry, EntryIsNotFound | ContentfulIsUnavailable, ContentfulConfig | HttpClient.HttpClient>
