import { HttpClientRequest } from 'effect/http'
import { v2 as cloudinary } from 'cloudinary'
import { Clock, Effect, pipe, Redacted } from 'effect'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { CloudinaryApi } from '../CloudinaryApi.ts'

export const CreateRequest = Effect.fnUntraced(function* (publicId: NonEmptyString) {
  const api = yield* CloudinaryApi
  const now = yield* Clock.currentTimeMillis

  return pipe(
    HttpClientRequest.post(cloudinary.utils.api_url('destroy', { cloud_name: api.cloudName, resource_type: 'image' })),
    HttpClientRequest.acceptJson,
    HttpClientRequest.bodyUrlParams(
      cloudinary.utils.sign_request(
        { public_id: publicId, timestamp: Math.round(now / 1000) },
        { api_key: Redacted.value(api.key), api_secret: Redacted.value(api.secret) },
      ),
    ),
  )
})
