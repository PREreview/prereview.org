import { describe, expect, it, vi } from '../../vitest.ts'
import { Effect, Layer, pipe } from 'effect'
import { Cloudinary } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ExternalInteractions/CloudinaryAvatars/DestroyAvatar.ts'
import * as fc from '../../fc.ts'

describe('DestroyAvatar', () => {
  it.effect.prop('when the image is destroyed', [fc.nonEmptyString()], ([avatarId]) =>
    Effect.gen(function* () {
      const destroyImage = vi.fn<(typeof Cloudinary.Cloudinary.Service)['destroyImage']>(() => Effect.void)

      yield* pipe(_.DestroyAvatar(avatarId), Effect.provide(Layer.mock(Cloudinary.Cloudinary, { destroyImage })))

      expect(destroyImage).toHaveBeenCalledExactlyOnceWith(`prereview-profile/${avatarId}`)
    }),
  )

  it.effect.prop(
    "when the image can't be destroyed",
    [fc.nonEmptyString(), fc.httpClientRequestError()],
    ([avatarId, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.DestroyAvatar(avatarId),
          Effect.provide(Layer.mock(Cloudinary.Cloudinary, { destroyImage: () => Effect.fail(error) })),
          Effect.flip,
        )

        expect(actual).toStrictEqual(new _.FailedToDestroyAvatar({ cause: error }))
      }),
  )
})
