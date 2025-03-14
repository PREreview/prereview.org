import { HttpClient, HttpClientResponse, type UrlParams } from '@effect/platform'
import { Context, Effect, pipe, Schema } from 'effect'
import { URL } from 'url'
import { ZenodoRecordForACommentSchema } from './TransformRecordToCommentWithoutText.js'

const RecordsSchema = Schema.Struct({
  hits: Schema.Struct({
    hits: Schema.Array(ZenodoRecordForACommentSchema),
  }),
})

export class ZenodoOrigin extends Context.Tag('ZenodoHostname')<ZenodoOrigin, URL>() {}

export const getCommunityRecords = Effect.fn(function* (urlParams: UrlParams.UrlParams) {
  const httpClient = yield* HttpClient.HttpClient
  const zenodoOrigin = yield* ZenodoOrigin
  const zenodoCommunityRecordsApiUrl = new URL('/api/communities/prereview-reviews/records', zenodoOrigin)
  return yield* pipe(
    httpClient.get(zenodoCommunityRecordsApiUrl, { urlParams }),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecordsSchema)),
  )
})
