import { HttpClient, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import { Zenodo } from '../ExternalApis/index.ts'
import { Doi } from '../types/index.ts'

const RecordSchema = Schema.Struct({
  metadata: Schema.Struct({
    doi: Doi.DoiSchema,
  }),
})

export const getDoiForPrereview = (prereviewId: number) =>
  Effect.gen(function* () {
    const zenodoApi = yield* Zenodo.ZenodoApi
    const url = new URL(`/api/records/${prereviewId}`, zenodoApi.origin)

    return yield* pipe(
      HttpClientRequest.get(url),
      HttpClientRequest.bearerToken(zenodoApi.key),
      HttpClient.execute,
      Effect.andThen(HttpClientResponse.schemaBodyJson(RecordSchema)),
      Effect.andThen(record => record.metadata.doi),
    )
  })
