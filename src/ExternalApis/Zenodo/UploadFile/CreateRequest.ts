import { HttpClientRequest } from '@effect/platform'
import { Effect, pipe } from 'effect'
import type { UnsubmittedDeposition } from '../Deposition.js'
import { ZenodoApi } from '../ZenodoApi.js'

export interface File {
  readonly name: string
  readonly content: string
}

export const CreateRequest = Effect.fn(function* (deposition: UnsubmittedDeposition, upload: File) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.put(`${deposition.links.bucket.origin}${deposition.links.bucket.pathname}/${upload.name}`),
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.bodyText(upload.content, 'application/octet-stream'),
  )
})
