import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import type { URL } from 'url'
import { ZenodoRecordForACommentSchema } from './TransformRecordToCommentWithoutText.ts'

const RecordsSchema = Schema.Struct({
  hits: Schema.Struct({
    hits: Schema.Array(ZenodoRecordForACommentSchema),
  }),
})

export const getCommunityRecords = Effect.fn(function* (url: URL) {
  const httpClient = yield* HttpClient.HttpClient

  return yield* pipe(
    httpClient.get(url),
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecordsSchema)),
  )
})
