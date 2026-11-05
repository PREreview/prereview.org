import type { HttpClient } from 'effect/http'
import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { CloudinaryApi } from './CloudinaryApi.ts'
import { DestroyImage } from './DestroyImage/index.ts'
import { ImageUrl } from './ImageUrl/index.ts'
import { UploadImage } from './UploadImage/index.ts'

export { CloudinaryApi } from './CloudinaryApi.ts'
export * from './legacy-cloudinary.ts'
export type { UploadImageInput } from './UploadImage/index.ts'

export class Cloudinary extends Context.Service<
  Cloudinary,
  {
    destroyImage: (
      ...args: Parameters<typeof DestroyImage>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof DestroyImage>>, Effect.Error<ReturnType<typeof DestroyImage>>>
    imageUrl: (...args: Parameters<typeof ImageUrl>) => Effect.Effect<Effect.Success<ReturnType<typeof ImageUrl>>>
    uploadImage: (
      ...args: Parameters<typeof UploadImage>
    ) => Effect.Effect<Effect.Success<ReturnType<typeof UploadImage>>, Effect.Error<ReturnType<typeof UploadImage>>>
  }
>()('Cloudinary') {}

export const destroyImage = (...args: Parameters<(typeof Cloudinary.Service)['destroyImage']>) =>
  Cloudinary.use(service => service.destroyImage(...args))

export const imageUrl = (...args: Parameters<(typeof Cloudinary.Service)['imageUrl']>) =>
  Cloudinary.use(service => service.imageUrl(...args))

export const uploadImage = (...args: Parameters<(typeof Cloudinary.Service)['uploadImage']>) =>
  Cloudinary.use(service => service.uploadImage(...args))

const make: Effect.Effect<typeof Cloudinary.Service, never, HttpClient.HttpClient | CloudinaryApi> = Effect.gen(
  function* () {
    const context = yield* Effect.map(
      Effect.context<HttpClient.HttpClient | CloudinaryApi>(),
      Context.omit(Scope.Scope),
    )

    return {
      destroyImage: flow(DestroyImage, Effect.provide(context)),
      imageUrl: flow(ImageUrl, Effect.provide(context)),
      uploadImage: flow(UploadImage, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(Cloudinary, make)
