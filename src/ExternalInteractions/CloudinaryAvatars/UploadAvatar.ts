import { Data, Effect, FileSystem, pipe, String } from 'effect'
import { Cloudinary } from '../../ExternalApis/index.ts'
import { PublicUrl } from '../../public-url.ts'
import { NonEmptyString, type OrcidId } from '../../types/index.ts'
import { Folder } from './Folder.ts'

export interface AvatarFile {
  path: string
  mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp'
}

export class FailedToUploadAvatar extends Data.TaggedError('FailedToUploadAvatar')<{
  cause?: unknown
}> {}

const FolderPrefix = new RegExp(`^${Folder}/`)

export const UploadAvatar = Effect.fn('CloudinaryAvatars.uploadAvatar')(
  function* (orcid: OrcidId.OrcidId, avatar: AvatarFile) {
    const fileSystem = yield* FileSystem.FileSystem
    const publicUrl = yield* PublicUrl

    const file = yield* fileSystem.readFile(avatar.path)

    const publicId = yield* Cloudinary.uploadImage({
      file,
      mimetype: avatar.mimetype,
      folder: Folder,
      context: { orcid_id: orcid, instance: publicUrl.hostname },
    })

    return yield* pipe(publicId, String.replace(FolderPrefix, ''), NonEmptyString.fromString, Effect.fromOption)
  },
  Effect.tapError(error =>
    Effect.logError('Failed to upload image to Cloudinary').pipe(Effect.annotateLogs({ error: error.message })),
  ),
  Effect.mapError(error => new FailedToUploadAvatar({ cause: error })),
)
