import { Multipart } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Either, Inspectable } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.js'
import * as _ from '../../src/my-details-page/change-avatar.js'
import { changeAvatarMatch, myDetailsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('changeAvatar', () => {
  test.prop([
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
  ])('when the avatar can be saved', async (file, user, locale) => {
    const actual = await _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
      saveAvatar: () => TE.right(undefined),
    })()

    expect(actual).toStrictEqual({
      _tag: 'FlashMessageResponse',
      location: format(myDetailsMatch.formatter, {}),
      message: 'avatar-changed',
    })
  })

  test.prop([
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
  ])("when the avatar can't be saved", async (file, user, locale) => {
    const saveAvatar = jest.fn<_.Env['saveAvatar']>(_ => TE.left('unavailable'))

    const actual = await _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
      saveAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: StatusCodes.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'main',
      js: [],
    })
    expect(saveAvatar).toHaveBeenCalledWith(user.orcid, { path: file.path, mimetype: file.contentType as never })
  })

  test.prop([
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
  ])('when it is not an image', async (file, user, locale) => {
    const actual = await _.changeAvatar({ body: Either.right({ avatar: [file] }), locale, method: 'POST', user })({
      saveAvatar: shouldNotBeCalled,
    })()

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
  })

  test.prop([
    fc
      .record({
        reason: fc.constantFrom('FileTooLarge', 'FieldTooLarge', 'BodyTooLarge', 'InternalError'),
        cause: fc.anything(),
      })
      .map(args => new Multipart.MultipartError(args)),
    fc.user(),
    fc.supportedLocale(),
  ])('when the avatar is too big', async (body, user, locale) => {
    const actual = await _.changeAvatar({
      body: Either.left(body),
      locale,
      method: 'POST',
      user,
    })({
      saveAvatar: shouldNotBeCalled,
    })()

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
  })

  test.prop([
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
  ])('when the avatar is missing', async (body, user, locale) => {
    const actual = await _.changeAvatar({ body, locale, method: 'POST', user })({
      saveAvatar: shouldNotBeCalled,
    })()

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
  })

  test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale()])(
    'when the form needs to be submitted',
    async (body, method, user, locale) => {
      const actual = await _.changeAvatar({ body, locale, method, user })({
        saveAvatar: shouldNotBeCalled,
      })()

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
    },
  )

  test.prop([fc.anything(), fc.string(), fc.supportedLocale()])(
    'when the user is not logged in',
    async (body, method, locale) => {
      const actual = await _.changeAvatar({ body, locale, method })({
        saveAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    },
  )
})
