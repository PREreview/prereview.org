import { HttpClient, HttpClientResponse, type UrlParams } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import { URL } from 'url'
import { ZenodoRecordForACommentSchema } from './TransformRecordToCommentWithoutText.js'

const RecordsSchema = Schema.Struct({
  hits: Schema.Struct({
    hits: Schema.Array(ZenodoRecordForACommentSchema),
  }),
})

export const getCommunityRecords = Effect.fn(function* (urlParams: UrlParams.UrlParams) {
  const httpClient = yield* HttpClient.HttpClient
  const zenodoCommunityRecordsApiUrl = new URL('https://sandbox.zenodo.org/api/communities/prereview-reviews/records')
  return yield* pipe(
    httpClient.get(zenodoCommunityRecordsApiUrl, { urlParams }),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecordsSchema)),
    Effect.scoped,
  )
})
