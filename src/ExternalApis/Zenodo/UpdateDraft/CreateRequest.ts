import { Effect, pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'
import { Draft } from '../Draft.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (draft: Draft) {
  const api = yield* ZenodoApi

  return yield* pipe(
    HttpClientRequest.put(`${api.origin.origin}/api/records/${draft.id}/draft`),
    HttpClientRequest.accept('application/vnd.inveniordm.v1+json'),
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.schemaBodyJson(Draft)(draft),
  )
})
