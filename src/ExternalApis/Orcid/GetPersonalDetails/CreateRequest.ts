import { HttpClientRequest } from '@effect/platform'
import { Effect, identity, Option, pipe } from 'effect'
import type { OrcidId } from '../../../types/index.ts'
import { OrcidApi } from '../OrcidApi.ts'

export const CreateRequest = Effect.fn(function* (orcidId: OrcidId.OrcidId) {
  const api = yield* OrcidApi

  return pipe(
    HttpClientRequest.get(`${api.origin.origin}/v3.0/${orcidId}/personal-details`),
    HttpClientRequest.acceptJson,
    Option.match(api.token, { onSome: token => HttpClientRequest.bearerToken(token), onNone: () => identity }),
  )
})
