import { Effect, pipe } from 'effect'
import { HttpClientRequest } from 'effect/http'
import type { Draft } from '../Draft.ts'
import type { File } from '../UploadFile/index.ts'
import { ZenodoApi } from '../ZenodoApi.ts'

export const CreateRequest = Effect.fnUntraced(function* ({ draft, file }: { draft: Draft; file: File }) {
  const api = yield* ZenodoApi

  return pipe(
    HttpClientRequest.put(
      `${api.origin.origin}/api/records/${draft.id}/draft/files/${encodeURIComponent(file.name)}/content`,
    ),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bearerToken(api.key),
    HttpClientRequest.bodyText(file.content, 'application/octet-stream'),
  )
})
