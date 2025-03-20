import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import * as Doi from '../types/Doi.js'
import { ZenodoOrigin } from './CommunityRecords.js'

const RecordSchema = Schema.Struct({
  metadata: Schema.Struct({
    doi: Doi.DoiSchema,
  }),
})

export const getDoiForPrereview = (prereviewId: number) =>
  Effect.gen(function* () {
    const httpClient = yield* HttpClient.HttpClient
    const zenodoOrigin = yield* ZenodoOrigin
    const url = new URL(`/api/records/${prereviewId}`, zenodoOrigin)

    return yield* pipe(
      httpClient.get(url),
      Effect.andThen(HttpClientResponse.schemaBodyJson(RecordSchema)),
      Effect.andThen(record => record.metadata.doi),
    )
  })
