import { Effect, pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'
import type { Draft } from '../Draft.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (draft: Draft) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.delete(`${api.origin.origin}/api/records/${draft.id}/draft`),
    HttpClientRequest.accept('application/vnd.inveniordm.v1+json'),
    HttpClientRequest.bearerToken(api.key),
  )
})
