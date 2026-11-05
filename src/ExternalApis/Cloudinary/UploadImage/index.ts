import { HttpClient } from 'effect/http'
import { Effect, pipe } from 'effect'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'
import type { UploadImageInput } from './UploadImageInput.ts'

export type { UploadImageInput } from './UploadImageInput.ts'

export const UploadImage = (input: UploadImageInput) =>
  pipe(
    CreateRequest(input),
    Effect.andThen(HttpClient.execute),
    Effect.andThen(HandleResponse),
    Effect.withSpan('Cloudinary.uploadImage', { attributes: { folder: input.folder, mimetype: input.mimetype } }),
  )
