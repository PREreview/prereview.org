import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe, Redacted } from 'effect'
import { GhostApi } from '../GhostApi.js'

export const CreateRequest = Effect.fn(function* (id: string) {
  const ghostApi = yield* GhostApi

  return pipe(
    HttpClientRequest.get(`https://content.prereview.org/ghost/api/content/pages/${id}/`, {
      urlParams: { key: Redacted.value(ghostApi.key) },
    }),
    HttpClientRequest.acceptJson,
  )
})
