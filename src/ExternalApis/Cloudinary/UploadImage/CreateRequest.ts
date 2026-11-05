import { HttpClientRequest } from 'effect/http'
import { Base64 } from 'effect/encoding'
import { v2 as cloudinary } from 'cloudinary'
import { Array, Clock, Effect, pipe, Record, Redacted } from 'effect'
import { CloudinaryApi } from '../CloudinaryApi.ts'
import type { UploadImageInput } from './UploadImageInput.ts'

const encodeContext = (context: UploadImageInput['context']) =>
  pipe(
    Record.toEntries(context),
    Array.map(([key, value]) => `${key}=${value.replaceAll(/[=|]/g, '\\$&')}`),
    Array.join('|'),
  )

export const CreateRequest = Effect.fnUntraced(function* ({ context, file, folder, mimetype }: UploadImageInput) {
  const api = yield* CloudinaryApi
  const now = yield* Clock.currentTimeMillis

  return pipe(
    HttpClientRequest.post(cloudinary.utils.api_url('upload', { cloud_name: api.cloudName, resource_type: 'image' })),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyUrlParams({
      ...cloudinary.utils.sign_request(
        { folder, context: encodeContext(context), timestamp: Math.round(now / 1000) },
        { api_key: Redacted.value(api.key), api_secret: Redacted.value(api.secret) },
      ),
      file: `data:${mimetype};base64,${Base64.encode(file)}`,
    }),
  )
})
