import { Effect, pipe, Schema } from 'effect'
import { HttpClientRequest } from 'effect/http'
import type { Draft } from '../Draft.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* ({ draft, key }: { draft: Draft; key: string }) {
  const api = yield* ZenodoApi

  return yield* pipe(
    HttpClientRequest.post(`${api.origin.origin}/api/records/${draft.id}/draft/files`),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.schemaBodyJson(Schema.Tuple([Schema.Struct({ key: Schema.String })]))([{ key }]),
  )
})
