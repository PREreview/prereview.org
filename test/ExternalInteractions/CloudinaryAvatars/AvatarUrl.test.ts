import { describe, expect, it, vi } from '../../vitest.ts'
import { Effect, Layer, pipe } from 'effect'
import { Cloudinary } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ExternalInteractions/CloudinaryAvatars/AvatarUrl.ts'
import * as fc from '../../fc.ts'

describe('AvatarUrl', () => {
  it.effect.prop('builds a thumbnail URL', [fc.nonEmptyString(), fc.url()], ([avatarId, url]) =>
    Effect.gen(function* () {
      const imageUrl = vi.fn<(typeof Cloudinary.Cloudinary.Service)['imageUrl']>(() => Effect.succeed(url))

      const actual = yield* pipe(_.AvatarUrl(avatarId), Effect.provide(Layer.mock(Cloudinary.Cloudinary, { imageUrl })))

      expect(actual).toStrictEqual(url)
      expect(imageUrl).toHaveBeenCalledExactlyOnceWith(`prereview-profile/${avatarId}`, {
        crop: 'thumb',
        fetch_format: 'auto',
        quality: 'auto',
        gravity: 'face',
        width: 300,
        height: 300,
        zoom: 0.666,
      })
    }),
  )
})
