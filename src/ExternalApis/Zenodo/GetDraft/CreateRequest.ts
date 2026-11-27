import { Effect, pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (recordId: number) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.get(`${api.origin.origin}/api/records/${recordId}/draft`),
    HttpClientRequest.accept('application/vnd.inveniordm.v1+json'),
    HttpClientRequest.bearerToken(api.key),
  )
})
