import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { myDetailsMatch, removeAvatarMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/my-details-page/remove-avatar.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('removeAvatar', () => {
  it.effect.prop(
    'when the avatar can be deleted',
    [fc.user(), fc.supportedLocale(), fc.url()],
    ([user, locale, avatar]) =>
      Effect.gen(function* () {
        const deleteAvatar = vi.fn<_.Env['deleteAvatar']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.removeAvatar({ locale, method: 'POST', user })({
            deleteAvatar,
            getAvatar: () => TE.right(avatar),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(myDetailsMatch.formatter, {}),
          message: 'avatar-removed',
        })
        expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop(
    "when the avatar can't be deleted",
    [fc.user(), fc.supportedLocale(), fc.url()],
    ([user, locale, avatar]) =>
      Effect.gen(function* () {
        const deleteAvatar = vi.fn<_.Env['deleteAvatar']>(_ => TE.left('unavailable'))

        const actual = yield* Effect.promise(
          _.removeAvatar({ locale, method: 'POST', user })({
            deleteAvatar,
            getAvatar: () => TE.right(avatar),
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
        expect(deleteAvatar).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop(
    'when the form needs to be submitted',
    [fc.string().filter(method => method !== 'POST'), fc.user(), fc.supportedLocale(), fc.url()],
    ([method, user, locale, avatar]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.removeAvatar({ locale, method, user })({
            deleteAvatar: shouldNotBeCalled,
            getAvatar: () => TE.right(avatar),
          }),
        )

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
      }),
  )

  it.effect.prop('when there is no avatar', [fc.string(), fc.user(), fc.supportedLocale()], ([method, user, locale]) =>
    Effect.gen(function* () {
      const getAvatar = vi.fn<_.Env['getAvatar']>(_ => TE.left('not-found'))

      const actual = yield* Effect.promise(
        _.removeAvatar({ locale, method, user })({
          deleteAvatar: shouldNotBeCalled,
          getAvatar,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: StatusCodes.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
      expect(getAvatar).toHaveBeenCalledWith(user.orcid)
    }),
  )

  it.effect.prop(
    "when there the existing avatar can't be loaded",
    [fc.string(), fc.user(), fc.supportedLocale()],
    ([method, user, locale]) =>
      Effect.gen(function* () {
        const getAvatar = vi.fn<_.Env['getAvatar']>(_ => TE.left('unavailable'))

        const actual = yield* Effect.promise(
          _.removeAvatar({ locale, method, user })({
            deleteAvatar: shouldNotBeCalled,
            getAvatar,
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
        expect(getAvatar).toHaveBeenCalledWith(user.orcid)
      }),
  )

  it.effect.prop('when the user is not logged in', [fc.string(), fc.supportedLocale()], ([method, locale]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.removeAvatar({ locale, method })({
          deleteAvatar: shouldNotBeCalled,
          getAvatar: shouldNotBeCalled,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(myDetailsMatch.formatter, {}),
      })
    }),
  )
})
