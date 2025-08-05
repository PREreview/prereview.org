import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { UnsubmittedDeposition } from '../Deposition.js'
import { ZenodoApi } from '../ZenodoApi.js'

export const CreateRequest = Effect.fn(function* (deposition: UnsubmittedDeposition) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.post(deposition.links.publish.href),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
  )
})
