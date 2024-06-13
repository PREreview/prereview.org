import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-avatar.js'
import { changeAvatarMatch, myDetailsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('changeAvatar', () => {
  describe('when avatars can be uploaded', () => {
    test.prop([
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      }),
      fc.user(),
    ])('when the avatar can be saved', async (file, user) => {
      const actual = await _.changeAvatar({ body: { avatar: [file] }, method: 'POST', user })({
        canUploadAvatar: () => true,
        saveAvatar: () => TE.right(undefined),
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: format(myDetailsMatch.formatter, {}),
        message: 'avatar-changed',
      })
    })

    test.prop([
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
      }),
      fc.user(),
    ])("when the avatar can't be saved", async (file, user) => {
      const saveAvatar = jest.fn<_.Env['saveAvatar']>(_ => TE.left('unavailable'))

      const actual = await _.changeAvatar({ body: { avatar: [file] }, method: 'POST', user })({
        canUploadAvatar: () => true,
        saveAvatar,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
      expect(saveAvatar).toHaveBeenCalledWith(user.orcid, file)
    })

    test.prop([
      fc.record({
        buffer: fc.string().map(string => Buffer.from(string)),
        mimetype: fc
          .string()
          .filter(string => !['image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'].includes(string)),
      }),
      fc.user(),
    ])('when it is not an image', async (file, user) => {
      const actual = await _.changeAvatar({ body: { avatar: [file] }, method: 'POST', user })({
        canUploadAvatar: () => true,
        saveAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeAvatarMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('Error: Upload an avatar'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('avatar'),
        skipToLabel: 'form',
        js: ['error-summary.js', 'single-use-form.js'],
      })
    })

    test.prop([fc.user()])('when the avatar is too big', async user => {
      const actual = await _.changeAvatar({ body: { avatar: 'TOO_BIG' }, method: 'POST', user })({
        canUploadAvatar: () => true,
        saveAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeAvatarMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('Error: Upload an avatar'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('avatar'),
        skipToLabel: 'form',
        js: ['error-summary.js', 'single-use-form.js'],
      })
    })

    test.prop([
      fc.oneof(fc.anything(), fc.record({ avatar: fc.constant('ERROR') }, { withDeletedKeys: true })),
      fc.user(),
    ])('when the avatar is missing', async (body, user) => {
      const actual = await _.changeAvatar({ body, method: 'POST', user })({
        canUploadAvatar: () => true,
        saveAvatar: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(changeAvatarMatch.formatter, {}),
        status: Status.BadRequest,
        title: expect.stringContaining('Error: Upload an avatar'),
        nav: expect.stringContaining('Back'),
        main: expect.stringContaining('avatar'),
        skipToLabel: 'form',
        js: ['error-summary.js', 'single-use-form.js'],
      })
    })

    test.prop([fc.anything(), fc.string().filter(method => method !== 'POST'), fc.user()])(
      'when the form needs to be submitted',
      async (body, method, user) => {
        const actual = await _.changeAvatar({ body, method, user })({
          canUploadAvatar: () => true,
          saveAvatar: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(changeAvatarMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('avatar'),
          nav: expect.stringContaining('Back'),
          main: expect.stringContaining('avatar'),
          skipToLabel: 'form',
          js: ['single-use-form.js'],
        })
      },
    )
  })

  test.prop([fc.anything(), fc.string(), fc.user()])("when avatars can't be uploaded", async (body, method, user) => {
    const canUploadAvatar = jest.fn<_.Env['canUploadAvatar']>(_ => false)

    const actual = await _.changeAvatar({ body, method, user })({
      canUploadAvatar,
      saveAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.NotFound,
      title: expect.stringContaining('not found'),
      main: expect.stringContaining('not found'),
      skipToLabel: 'main',
      js: [],
    })
    expect(canUploadAvatar).toHaveBeenCalledWith(user)
  })

  test.prop([fc.anything(), fc.string()])('when the user is not logged in', async (body, method) => {
    const actual = await _.changeAvatar({ body, method })({
      canUploadAvatar: shouldNotBeCalled,
      saveAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
