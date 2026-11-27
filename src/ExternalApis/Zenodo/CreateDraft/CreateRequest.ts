import { Effect, pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'
import { NewDraft } from '../NewDraft.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (newDraft: NewDraft) {
  const api = yield* ZenodoApi

  return yield* pipe(
    HttpClientRequest.post(`${api.origin.origin}/api/records`),
    HttpClientRequest.accept('application/vnd.inveniordm.v1+json'),
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.schemaBodyJson(NewDraft)(newDraft),
  )
})
