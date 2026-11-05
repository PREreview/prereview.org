import { Effect } from 'effect'
import { Cloudinary } from '../../ExternalApis/index.ts'
import type { NonEmptyString } from '../../types/index.ts'
import { publicIdFor } from './Folder.ts'

export const AvatarUrl = Effect.fnUntraced(function* (avatarId: NonEmptyString.NonEmptyString) {
  return yield* Cloudinary.imageUrl(publicIdFor(avatarId), {
    crop: 'thumb',
    fetch_format: 'auto',
    quality: 'auto',
    gravity: 'face',
    width: 300,
    height: 300,
    zoom: 0.666,
  })
})
