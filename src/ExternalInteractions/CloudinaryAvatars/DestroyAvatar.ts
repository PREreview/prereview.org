import { Data, Effect } from 'effect'
import { Cloudinary } from '../../ExternalApis/index.ts'
import type { NonEmptyString } from '../../types/index.ts'
import { publicIdFor } from './Folder.ts'

export class FailedToDestroyAvatar extends Data.TaggedError('FailedToDestroyAvatar')<{
  cause?: unknown
}> {}

export const DestroyAvatar = Effect.fn('CloudinaryAvatars.destroyAvatar')(
  function* (avatarId: NonEmptyString.NonEmptyString) {
    yield* Cloudinary.destroyImage(publicIdFor(avatarId))
  },
  (effect, avatarId) =>
    effect.pipe(
      Effect.tapError(error =>
        Effect.logError('Failed to destroy image on Cloudinary').pipe(
          Effect.annotateLogs({ error: error.message, avatarId }),
        ),
      ),
      Effect.mapError(error => new FailedToDestroyAvatar({ cause: error })),
    ),
)
