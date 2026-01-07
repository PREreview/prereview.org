import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import type { URL } from 'url'
import { Zenodo } from '../../ExternalApis/index.ts'
import { ZenodoRecordForACommentSchema } from './TransformRecordToCommentWithoutText.ts'

const RecordsSchema = Schema.Struct({
  hits: Schema.Struct({
    hits: Schema.Array(ZenodoRecordForACommentSchema),
  }),
})

export const getCommunityRecords = Effect.fn(function* (url: URL) {
  const zenodoApi = yield* Zenodo.ZenodoApi

  return yield* pipe(
    HttpClientRequest.get(url),
    HttpClientRequest.bearerToken(zenodoApi.key),
    HttpClient.execute,
    Effect.andThen(HttpClientResponse.filterStatusOk),
    Effect.andThen(HttpClientResponse.schemaBodyJson(RecordsSchema)),
  )
})
