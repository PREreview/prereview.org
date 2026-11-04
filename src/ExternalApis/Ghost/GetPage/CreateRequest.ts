import { HttpClientRequest } from 'effect/http'
import { Effect, pipe, Redacted } from 'effect'
import { GhostApi } from '../GhostApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (id: string) {
  const ghostApi = yield* GhostApi

  return pipe(
    HttpClientRequest.get(`https://content.prereview.org/ghost/api/content/pages/${id}/`, {
      urlParams: { key: Redacted.value(ghostApi.key) },
    }),
    HttpClientRequest.acceptJson,
  )
})
