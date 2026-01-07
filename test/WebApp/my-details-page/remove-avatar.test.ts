import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { myDetailsMatch, removeAvatarMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/remove-avatar.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('removeAvatar', () => {
  test.prop([fc.user(), fc.supportedLocale(), fc.url()])(
    'when the avatar can be deleted',
    async (user, locale, avatar) => {
      const deleteAvatar = jest.fn<_.Env['deleteAvatar']>(_ => TE.right(undefined))

      const actual = await _.removeAvatar({ locale, method: 'POST', user })({
        deleteAvatar,
        getAvatar: () => TE.right(avatar),
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: format(myDetailsMatch.formatter, {}),
        message: 'avatar-removed',
      })
      expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.user(), fc.supportedLocale(), fc.url()])(
    "when the avatar can't be deleted",
    async (user, locale, avatar) => {
      const deleteAvatar = jest.fn<_.Env['deleteAvatar']>(_ => TE.left('unavailable'))

      const actual = await _.removeAvatar({ locale, method: 'POST', user })({
        deleteAvatar,
        getAvatar: () => TE.right(avatar),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale(), fc.url()])(
    'when the form needs to be submitted',
    async (method, user, locale, avatar) => {
      const actual = await _.removeAvatar({ locale, method, user })({
        deleteAvatar: shouldNotBeCalled,
        getAvatar: () => TE.right(avatar),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        canonical: format(removeAvatarMatch.formatter, {}),
        status: StatusCodes.OK,
        title: expect.anything(),
        nav: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'form',
        js: [],
      })
    },
  )

  test.prop([fc.string(), fc.user(), fc.supportedLocale()])('when there is no avatar', async (method, user, locale) => {
    const getAvatar = jest.fn<_.Env['getAvatar']>(_ => TE.left('not-found'))

    const actual = await _.removeAvatar({ locale, method, user })({
      deleteAvatar: shouldNotBeCalled,
      getAvatar,
    })()

    expect(actual).toStrictEqual({
      _tag: 'RedirectResponse',
      status: StatusCodes.SeeOther,
      location: format(myDetailsMatch.formatter, {}),
    })
    expect(getAvatar).toHaveBeenCalledWith(user.orcid)
  })

  test.prop([fc.string(), fc.user(), fc.supportedLocale()])(
    "when there the existing avatar can't be loaded",
    async (method, user, locale) => {
      const getAvatar = jest.fn<_.Env['getAvatar']>(_ => TE.left('unavailable'))

      const actual = await _.removeAvatar({ locale, method, user })({
        deleteAvatar: shouldNotBeCalled,
        getAvatar,
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
      expect(getAvatar).toHaveBeenCalledWith(user.orcid)
    },
  )

  test.prop([fc.string(), fc.supportedLocale()])('when the user is not logged in', async (method, locale) => {
    const actual = await _.removeAvatar({ locale, method })({
      deleteAvatar: shouldNotBeCalled,
      getAvatar: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(myDetailsMatch.formatter, {}),
    })
  })
})
