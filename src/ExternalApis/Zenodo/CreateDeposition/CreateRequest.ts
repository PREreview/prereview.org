import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe, Schema } from 'effect'
import { DepositMetadata } from '../Deposition.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fn(function* (metadata: DepositMetadata) {
  const api = yield* ZenodoApi

  return yield* pipe(
    HttpClientRequest.post(`${api.origin.origin}/api/deposit/depositions`),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.schemaBodyJson(Schema.Struct({ metadata: DepositMetadata }))({ metadata }),
  )
})
