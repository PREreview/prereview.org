import { Multipart } from 'effect/http'
import { describe, expect, it, vi } from '../../../vitest.ts'
import { Effect, Inspectable, Layer, Option, pipe, Result } from 'effect'
import { format } from 'fp-ts-routing'
import { Locale } from '../../../../src/Context.ts'
import { CloudinaryAvatars } from '../../../../src/ExternalInteractions/index.ts'
import { Avatars } from '../../../../src/Domain/Prereviewers/index.ts'
import * as Routes from '../../../../src/routes.ts'
import * as StatusCodes from '../../../../src/StatusCodes.ts'
import { LoggedInUser } from '../../../../src/user.ts'
import * as _ from '../../../../src/WebApp/MyDetails/AvatarPage/index.ts'
import * as fc from '../../../fc.ts'
import { shouldNotBeCalled } from '../../../should-not-be-called.ts'

const imageFile = (): fc.Arbitrary<Multipart.PersistedFile> =>
  fc
    .record({
      key: fc.string(),
      name: fc.string(),
      contentType: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      path: fc.string(),
    })
    .map(args => ({
      [Multipart.TypeId]: Multipart.TypeId,
      _tag: 'PersistedFile',
      ...args,
      toJSON: shouldNotBeCalled,
      [Inspectable.NodeInspectSymbol]: shouldNotBeCalled,
    }))

describe('AvatarPage', () => {
  it.effect.prop('shows the form', [fc.supportedLocale()], ([locale]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(_.AvatarPage, Effect.provideService(Locale, locale))

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeAvatar,
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['single-use-form.js'],
      })
    }),
  )
})

describe('AvatarSubmission', () => {
  it.effect.prop(
    'when the avatar can be saved',
    [fc.supportedLocale(), fc.user(), imageFile(), fc.nonEmptyString()],
    ([locale, user, file, avatarId]) =>
      Effect.gen(function* () {
        const uploadAvatar = vi.fn<(typeof CloudinaryAvatars.CloudinaryAvatars.Service)['uploadAvatar']>(() =>
          Effect.succeed(avatarId),
        )

        const { response, stored } = yield* pipe(
          Effect.gen(function* () {
            const response = yield* _.AvatarSubmission(Result.succeed({ avatar: [file] }))

            return { response, stored: yield* Avatars.Store.use(store => store.get(user.orcid)) }
          }),
          Effect.provide([
            Avatars.layerInMemory,
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { uploadAvatar }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(response).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(Routes.myDetailsMatch.formatter, {}),
          message: 'avatar-changed',
        })
        expect(stored).toStrictEqual(Option.some(avatarId))
        expect(uploadAvatar).toHaveBeenCalledExactlyOnceWith(user.orcid, {
          path: file.path,
          mimetype: file.contentType,
        })
      }),
  )

  it.effect.prop(
    "when the avatar can't be saved",
    [fc.supportedLocale(), fc.user(), imageFile()],
    ([locale, user, file]) =>
      Effect.gen(function* () {
        const actual = yield* pipe(
          _.AvatarSubmission(Result.succeed({ avatar: [file] })),
          Effect.provide([
            Avatars.layerInMemory,
            Layer.mock(CloudinaryAvatars.CloudinaryAvatars, {
              uploadAvatar: () => Effect.fail(new CloudinaryAvatars.FailedToUploadAvatar({})),
            }),
            Layer.succeed(Locale, locale),
            Layer.succeed(LoggedInUser, user),
          ]),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      }),
  )

  it.effect.prop('when the form is invalid', [fc.supportedLocale(), fc.user()], ([locale, user]) =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        _.AvatarSubmission(Result.succeed({})),
        Effect.provide([
          Avatars.layerInMemory,
          Layer.mock(CloudinaryAvatars.CloudinaryAvatars, { uploadAvatar: shouldNotBeCalled }),
          Layer.succeed(Locale, locale),
          Layer.succeed(LoggedInUser, user),
        ]),
      )

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: Routes.ChangeAvatar,
        status: StatusCodes.BadRequest,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: ['error-summary.js', 'single-use-form.js'],
      })
    }),
  )
})
