import { describe, expect, it, vi } from '../../vitest.ts'
import { Effect, FileSystem, Layer, pipe, PlatformError } from 'effect'
import { Cloudinary } from '../../../src/ExternalApis/index.ts'
import * as _ from '../../../src/ExternalInteractions/CloudinaryAvatars/UploadAvatar.ts'
import { PublicUrl } from '../../../src/public-url.ts'
import { NonEmptyString } from '../../../src/types/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

const avatarFile = (): fc.Arbitrary<_.AvatarFile> =>
  fc.record({
    path: fc.string(),
    mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
  })

const contents = () => fc.string().map(string => Buffer.from(string))

describe('UploadAvatar', () => {
  it.effect.prop(
    'when the avatar can be uploaded',
    [fc.origin(), fc.orcidId(), avatarFile(), contents(), fc.nonEmptyStringOf(fc.alphanumeric())],
    ([publicUrl, orcid, avatar, file, avatarId]) =>
      Effect.gen(function* () {
        const readFile = vi.fn<FileSystem.FileSystem['readFile']>(() => Effect.succeed(file))
        const uploadImage = vi.fn<(typeof Cloudinary.Cloudinary.Service)['uploadImage']>(() =>
          Effect.succeed(NonEmptyString.NonEmptyString(`prereview-profile/${avatarId}`)),
        )

        const actual = yield* pipe(
          _.UploadAvatar(orcid, avatar),
          Effect.provide([
            FileSystem.layerNoop({ readFile }),
            Layer.mock(Cloudinary.Cloudinary, { uploadImage }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
        )

        expect(actual).toStrictEqual(avatarId)
        expect(readFile).toHaveBeenCalledExactlyOnceWith(avatar.path)
        expect(uploadImage).toHaveBeenCalledExactlyOnceWith({
          file,
          mimetype: avatar.mimetype,
          folder: 'prereview-profile',
          context: { orcid_id: orcid, instance: publicUrl.hostname },
        })
      }),
  )

  it.effect.prop(
    'when the image has no folder',
    [fc.origin(), fc.orcidId(), avatarFile(), contents(), fc.nonEmptyStringOf(fc.alphanumeric())],
    ([publicUrl, orcid, avatar, file, avatarId]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.UploadAvatar(orcid, avatar),
          Effect.provide([
            FileSystem.layerNoop({ readFile: () => Effect.succeed(file) }),
            Layer.mock(Cloudinary.Cloudinary, { uploadImage: () => Effect.succeed(avatarId) }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
        )

        expect(actual).toStrictEqual(avatarId)
      }),
  )

  it.effect.prop(
    "when the avatar can't be uploaded",
    [fc.origin(), fc.orcidId(), avatarFile(), contents(), fc.httpClientRequestError()],
    ([publicUrl, orcid, avatar, file, error]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.UploadAvatar(orcid, avatar),
          Effect.provide([
            FileSystem.layerNoop({ readFile: () => Effect.succeed(file) }),
            Layer.mock(Cloudinary.Cloudinary, { uploadImage: () => Effect.fail(error) }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
          Effect.flip,
        )

        expect(actual).toStrictEqual(new _.FailedToUploadAvatar({ cause: error }))
      }),
  )

  it.effect.prop(
    'when the image has an empty ID inside the folder',
    [fc.origin(), fc.orcidId(), avatarFile(), contents()],
    ([publicUrl, orcid, avatar, file]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.UploadAvatar(orcid, avatar),
          Effect.provide([
            FileSystem.layerNoop({ readFile: () => Effect.succeed(file) }),
            Layer.mock(Cloudinary.Cloudinary, {
              uploadImage: () => Effect.succeed(NonEmptyString.NonEmptyString('prereview-profile/')),
            }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
          Effect.flip,
        )

        expect(actual._tag).toStrictEqual('FailedToUploadAvatar')
      }),
  )

  it.effect.prop(
    "when the avatar can't be read",
    [fc.origin(), fc.orcidId(), avatarFile()],
    ([publicUrl, orcid, avatar]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.UploadAvatar(orcid, avatar),
          Effect.provide([
            FileSystem.layerNoop({
              readFile: path =>
                Effect.fail(
                  PlatformError.systemError({
                    _tag: 'NotFound',
                    module: 'FileSystem',
                    method: 'readFile',
                    pathOrDescriptor: path,
                  }),
                ),
            }),
            Layer.mock(Cloudinary.Cloudinary, { uploadImage: shouldNotBeCalled }),
            Layer.succeed(PublicUrl, publicUrl),
          ]),
          Effect.flip,
        )

        expect(actual._tag).toStrictEqual('FailedToUploadAvatar')
      }),
  )
})
