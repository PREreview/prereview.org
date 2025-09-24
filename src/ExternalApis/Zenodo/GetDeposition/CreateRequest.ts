import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fn(function* (recordId: number) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.get(`${api.origin.origin}/api/deposit/depositions/${recordId}`),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
  )
})
