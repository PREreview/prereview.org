import { Multipart } from '@effect/platform'
import { it } from '@effect/vitest'
import { Effect, Either, Inspectable } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { describe, expect, vi } from 'vitest'
import { changeAvatarMatch, myDetailsMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/change-avatar.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('changeAvatar', () => {
  it.effect.prop(
    'when the avatar can be saved',
    [
      fc
        .record({
          key: fc.string(),
          name: fc.string(),
          contentType: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
          path: fc.string(),
        })
        .map(
          (args): Multipart.PersistedFile => ({
            [Multipart.TypeId]: Multipart.TypeId,
            _tag: 'PersistedFile',
            ...args,
            toJSON: shouldNotBeCalled,
            [Inspectable.NodeInspectSymbol]: shouldNotBeCalled,
          }),
        ),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([file, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
            saveAvatar: () => TE.right(undefined),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(myDetailsMatch.formatter, {}),
          message: 'avatar-changed',
        })
      }),
  )

  it.effect.prop(
    "when the avatar can't be saved",
    [
      fc
        .record({
          key: fc.string(),
          name: fc.string(),
          contentType: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
          path: fc.string(),
        })
        .map(
          (args): Multipart.PersistedFile => ({
            [Multipart.TypeId]: Multipart.TypeId,
            _tag: 'PersistedFile',
            ...args,
            toJSON: shouldNotBeCalled,
            [Inspectable.NodeInspectSymbol]: shouldNotBeCalled,
          }),
        ),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([file, user, locale]) =>
      Effect.gen(function* () {
        const saveAvatar = vi.fn<_.Env['saveAvatar']>(_ => TE.left('unavailable'))

        const actual = yield* Effect.promise(
          _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
            saveAvatar,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
        expect(saveAvatar).toHaveBeenCalledWith(user.orcid, { path: file.path, mimetype: file.contentType as never })
      }),
  )

  it.effect.prop(
    'when it is not an image',
    [
      fc
        .record({
          key: fc.string(),
          name: fc.string(),
          contentType: fc
            .string()
            .filter(string => !['image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'].includes(string)),
          path: fc.string(),
        })
        .map(
          (args): Multipart.PersistedFile => ({
            [Multipart.TypeId]: Multipart.TypeId,
            _tag: 'PersistedFile',
            ...args,
            toJSON: shouldNotBeCalled,
            [Inspectable.NodeInspectSymbol]: shouldNotBeCalled,
          }),
        ),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([file, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
            saveAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js', 'single-use-form.js'],
        })
      }),
  )

  it.effect.prop(
    'when the avatar is too big',
    [
      fc
        .record({
          reason: fc.constantFrom('FileTooLarge', 'FieldTooLarge', 'BodyTooLarge', 'InternalError'),
          cause: fc.anything(),
        })
        .map(args => new Multipart.MultipartError(args)),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({
            body: Either.left(body),
            locale,
            method: 'POST',
            user,
          })({
            saveAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js', 'single-use-form.js'],
        })
      }),
  )

  it.effect.prop(
    'when the avatar is missing',
    [
      fc.oneof(
        fc
          .record({
            reason: fc.constantFrom('TooManyParts', 'Parse'),
            cause: fc.anything(),
          })
          .map(args => Either.left(new Multipart.MultipartError(args))),
        fc.anything().map(Either.right),
        fc.anything(),
      ),
      fc.user(),
      fc.supportedLocale(),
    ],
    ([body, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({ body, locale, method: 'POST', user })({
            saveAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: StatusCodes.BadRequest,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['error-summary.js', 'single-use-form.js'],
        })
      }),
  )

  it.effect.prop(
    'when the form needs to be submitted',
    [fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale()],
    ([body, method, user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({ body, locale, method, user })({
            saveAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: StatusCodes.OK,
          title: expect.anything(),
          nav: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
      }),
  )

  it.effect.prop(
    'when the user is not logged in',
    [fc.anything(), fc.string(), fc.supportedLocale()],
    ([body, method, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.changeAvatar({ body, locale, method })({
            saveAvatar: shouldNotBeCalled,
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'LogInResponse',
          location: format(myDetailsMatch.formatter, {}),
        })
      }),
  )
})
