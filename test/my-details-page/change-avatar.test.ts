import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { Status } from 'hyper-ts'
import * as _ from '../../src/my-details-page/change-avatar.js'
import { changeAvatarMatch, myDetailsMatch } from '../../src/routes.js'
import * as fc from '../fc.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'

describe('changeAvatar', () => {
  test.prop([
    fc.record({
      buffer: fc.string().map(string => Buffer.from(string)),
      mimetype: fc.constantFrom('image/avif', 'image/heic', 'image/jpeg', 'image/png', 'image/webp'),
    }),
    fc.user(),
    fc.supportedLocale(),
  ])('when the avatar can be saved', async (file, user, locale) => {
    const actual = await _.changeAvatar({ body: { avatar: [file] }, locale, method: 'POST', user })({
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
    fc.supportedLocale(),
  ])("when the avatar can't be saved", async (file, user, locale) => {
    const saveAvatar = jest.fn<_.Env['saveAvatar']>(_ => TE.left('unavailable'))

    const actual = await _.changeAvatar({ body: { avatar: [file] }, locale, method: 'POST', user })({
      saveAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      status: Status.ServiceUnavailable,
      title: expect.anything(),
      main: expect.anything(),
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
    fc.supportedLocale(),
  ])('when it is not an image', async (file, user, locale) => {
    const actual = await _.changeAvatar({ body: { avatar: [file] }, locale, method: 'POST', user })({
      saveAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeAvatarMatch.formatter, {}),
      status: Status.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['error-summary.js', 'single-use-form.js'],
    })
  })

  test.prop([fc.user(), fc.supportedLocale()])('when the avatar is too big', async (user, locale) => {
    const actual = await _.changeAvatar({ body: { avatar: 'TOO_BIG' }, locale, method: 'POST', user })({
      saveAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeAvatarMatch.formatter, {}),
      status: Status.BadRequest,
      title: expect.anything(),
      nav: expect.anything(),
      main: expect.anything(),
      skipToLabel: 'form',
      js: ['error-summary.js', 'single-use-form.js'],
    })
  })

  test.prop([
    fc.oneof(fc.anything(), fc.record({ avatar: fc.constant('ERROR') }, { requiredKeys: [] })),
    fc.user(),
    fc.supportedLocale(),
  ])('when the avatar is missing', async (body, user, locale) => {
    const actual = await _.changeAvatar({ body, locale, method: 'POST', user })({
      saveAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'PageResponse',
      canonical: format(changeAvatarMatch.formatter, {}),
      status: Status.BadRequest,
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
        status: Status.OK,
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
