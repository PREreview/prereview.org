import { Effect, pipe, Schema } from 'effect'
import { HttpClientRequest } from 'effect/http'
import type { Uuid } from '../../../types/Uuid.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* ({
  recordId,
  communityId,
}: {
  recordId: number
  communityId: Uuid
}) {
  const api = yield* ZenodoApi

  return yield* pipe(
    HttpClientRequest.post(`${api.origin.origin}/api/records/${recordId}/communities`),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.schemaBodyJson(
      Schema.Struct({ communities: Schema.Tuple([Schema.Struct({ id: Schema.String })]) }),
    )({ communities: [{ id: communityId }] }),
  )
})
