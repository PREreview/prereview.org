import { describe, expect, it, vi } from '@effect/vitest'
import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { disconnectSlackMatch, myDetailsMatch } from '../../../src/routes.ts'
import type { DeleteSlackUserIdEnv } from '../../../src/slack-user-id.ts'
import type { IsSlackUserEnv } from '../../../src/slack-user.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import * as _ from '../../../src/WebApp/disconnect-slack-page/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('disconnectSlack', () => {
  describe('when the user is logged in', () => {
    it.effect.prop(
      'when Slack is connected',
      [fc.user(), fc.supportedLocale(), fc.string().filter(method => method !== 'POST')],
      ([user, locale, method]) =>
        Effect.gen(function* () {
          const isSlackUser = vi.fn<IsSlackUserEnv['isSlackUser']>(_ => TE.right(true))

          const actual = yield* Effect.promise(
            _.disconnectSlack({ locale, method, user })({
              deleteSlackUserId: shouldNotBeCalled,
              isSlackUser,
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'PageResponse',
            canonical: format(disconnectSlackMatch.formatter, {}),
            status: StatusCodes.OK,
            title: expect.anything(),
            main: expect.anything(),
            skipToLabel: 'main',
            js: [],
          })
          expect(isSlackUser).toHaveBeenCalledWith(user.orcid)
        }),
    )

    it.effect.prop('when the form is submitted', [fc.user(), fc.supportedLocale()], ([user, locale]) =>
      Effect.gen(function* () {
        const deleteSlackUserId = vi.fn<DeleteSlackUserIdEnv['deleteSlackUserId']>(_ => TE.right(undefined))

        const actual = yield* Effect.promise(
          _.disconnectSlack({ locale, method: 'POST', user })({
            deleteSlackUserId,
            isSlackUser: () => TE.right(true),
          }),
        )

        expect(actual).toStrictEqual({
          _tag: 'FlashMessageResponse',
          location: format(myDetailsMatch.formatter, {}),
          message: 'slack-disconnected',
        })
        expect(deleteSlackUserId).toHaveBeenCalledWith(user.orcid)
      }),
    )

    it.effect.prop(
      'when Slack is not connected',
      [fc.user(), fc.supportedLocale(), fc.string()],
      ([user, locale, method]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.disconnectSlack({ locale, method, user })({
              deleteSlackUserId: shouldNotBeCalled,
              isSlackUser: () => TE.right(false),
            }),
          )

          expect(actual).toStrictEqual({
            _tag: 'RedirectResponse',
            status: StatusCodes.SeeOther,
            location: format(myDetailsMatch.formatter, {}),
          })
        }),
    )

    it.effect.prop("when Slack user can't be disconnected", [fc.user(), fc.supportedLocale()], ([user, locale]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.disconnectSlack({ locale, method: 'POST', user })({
            deleteSlackUserId: () => TE.left('unavailable'),
            isSlackUser: () => TE.right(true),
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
      }),
    )

    it.effect.prop(
      "when the Slack user can't be loaded",
      [fc.user(), fc.supportedLocale(), fc.string()],
      ([user, locale, method]) =>
        Effect.gen(function* () {
          const actual = yield* Effect.promise(
            _.disconnectSlack({ locale, method, user })({
              deleteSlackUserId: shouldNotBeCalled,
              isSlackUser: () => TE.left('unavailable'),
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
        }),
    )
  })

  it.effect.prop('when the user is not logged in', [fc.supportedLocale(), fc.string()], ([locale, method]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.disconnectSlack({ locale, method, user: undefined })({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser: shouldNotBeCalled,
        }),
      )

      expect(actual).toStrictEqual({
        _tag: 'LogInResponse',
        location: format(disconnectSlackMatch.formatter, {}),
      })
    }),
  )
})
