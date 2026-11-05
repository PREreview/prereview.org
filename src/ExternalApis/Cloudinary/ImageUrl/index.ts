import { v2 as cloudinary, type ImageTransformationOptions } from 'cloudinary'
import { Effect } from 'effect'
import { CloudinaryApi } from '../CloudinaryApi.ts'

export const ImageUrl = Effect.fnUntraced(function* (publicId: string, transformation: ImageTransformationOptions) {
  const api = yield* CloudinaryApi

  return new URL(
    cloudinary.url(publicId, {
      cloud_name: api.cloudName,
      force_version: false,
      transformation,
      urlAnalytics: false,
    }),
  )
})
