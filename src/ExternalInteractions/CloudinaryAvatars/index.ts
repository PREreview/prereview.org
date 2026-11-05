import { Context, Effect, type FileSystem, flow, Layer, Scope } from 'effect'
import type { Cloudinary } from '../../ExternalApis/index.ts'
import type { PublicUrl } from '../../public-url.ts'
import { AvatarUrl } from './AvatarUrl.ts'
import { DestroyAvatar } from './DestroyAvatar.ts'
import { UploadAvatar } from './UploadAvatar.ts'

export { FailedToDestroyAvatar } from './DestroyAvatar.ts'
export { FailedToUploadAvatar, type AvatarFile } from './UploadAvatar.ts'

export class CloudinaryAvatars extends Context.Service<
  CloudinaryAvatars,
  {
    avatarUrl: (...args: Parameters<typeof AvatarUrl>) => Effect.Effect<Effect.Success<ReturnType<typeof AvatarUrl>>>
    destroyAvatar: (
      ...args: Parameters<typeof DestroyAvatar>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof DestroyAvatar>>, Effect.Error<ReturnType<typeof DestroyAvatar>>>
    uploadAvatar: (
      ...args: Parameters<typeof UploadAvatar>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof UploadAvatar>>, Effect.Error<ReturnType<typeof UploadAvatar>>>
  }
>()('CloudinaryAvatars') {}

export const avatarUrl = (...args: Parameters<(typeof CloudinaryAvatars.Service)['avatarUrl']>) =>
  CloudinaryAvatars.use(service => service.avatarUrl(...args))

export const destroyAvatar = (...args: Parameters<(typeof CloudinaryAvatars.Service)['destroyAvatar']>) =>
  CloudinaryAvatars.use(service => service.destroyAvatar(...args))

export const uploadAvatar = (...args: Parameters<(typeof CloudinaryAvatars.Service)['uploadAvatar']>) =>
  CloudinaryAvatars.use(service => service.uploadAvatar(...args))

const make: Effect.Effect<
  typeof CloudinaryAvatars.Service,
  never,
  Cloudinary.Cloudinary | FileSystem.FileSystem | PublicUrl
> = Effect.gen(function* () {
  const context = yield* Effect.map(
    Effect.context<Cloudinary.Cloudinary | FileSystem.FileSystem | PublicUrl>(),
    Context.omit(Scope.Scope),
  )

  return {
    avatarUrl: flow(AvatarUrl, Effect.provide(context)),
    destroyAvatar: flow(DestroyAvatar, Effect.provide(context)),
    uploadAvatar: flow(UploadAvatar, Effect.provide(context)),
  }
})

export const layer = Layer.effect(CloudinaryAvatars, make)
