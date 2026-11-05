import { HttpClient } from 'effect/http'
import { Effect, pipe } from 'effect'
import type { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { CreateRequest } from './CreateRequest.ts'
import { HandleResponse } from './HandleResponse.ts'

export const DestroyImage = (publicId: NonEmptyString) =>
  pipe(
    CreateRequest(publicId),
    Effect.andThen(HttpClient.execute),
    Effect.andThen(HandleResponse),
    Effect.withSpan('Cloudinary.destroyImage', { attributes: { publicId } }),
  )
