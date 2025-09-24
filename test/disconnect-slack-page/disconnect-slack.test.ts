import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as StatusCodes from '../../src/StatusCodes.ts'
import * as _ from '../../src/disconnect-slack-page/index.ts'
import { disconnectSlackMatch, myDetailsMatch } from '../../src/routes.ts'
import type { DeleteSlackUserIdEnv } from '../../src/slack-user-id.ts'
import type { IsSlackUserEnv } from '../../src/slack-user.ts'
import * as fc from '../fc.ts'
import { shouldNotBeCalled } from '../should-not-be-called.ts'

describe('disconnectSlack', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user(), fc.supportedLocale(), fc.string().filter(method => method !== 'POST')])(
      'when Slack is connected',
      async (user, locale, method) => {
        const isSlackUser = jest.fn<IsSlackUserEnv['isSlackUser']>(_ => TE.right(true))

        const actual = await _.disconnectSlack({ locale, method, user })({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser,
        })()

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
      },
    )

    test.prop([fc.user(), fc.supportedLocale()])('when the form is submitted', async (user, locale) => {
      const deleteSlackUserId = jest.fn<DeleteSlackUserIdEnv['deleteSlackUserId']>(_ => TE.right(undefined))

      const actual = await _.disconnectSlack({ locale, method: 'POST', user })({
        deleteSlackUserId,
        isSlackUser: () => TE.right(true),
      })()

      expect(actual).toStrictEqual({
        _tag: 'FlashMessageResponse',
        location: format(myDetailsMatch.formatter, {}),
        message: 'slack-disconnected',
      })
      expect(deleteSlackUserId).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([fc.user(), fc.supportedLocale(), fc.string()])(
      'when Slack is not connected',
      async (user, locale, method) => {
        const actual = await _.disconnectSlack({ locale, method, user })({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser: () => TE.right(false),
        })()

        expect(actual).toStrictEqual({
          _tag: 'RedirectResponse',
          status: StatusCodes.SeeOther,
          location: format(myDetailsMatch.formatter, {}),
        })
      },
    )

    test.prop([fc.user(), fc.supportedLocale()])("when Slack user can't be disconnected", async (user, locale) => {
      const actual = await _.disconnectSlack({ locale, method: 'POST', user })({
        deleteSlackUserId: () => TE.left('unavailable'),
        isSlackUser: () => TE.right(true),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: StatusCodes.ServiceUnavailable,
        title: expect.anything(),
        main: expect.anything(),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.user(), fc.supportedLocale(), fc.string()])(
      "when the Slack user can't be loaded",
      async (user, locale, method) => {
        const actual = await _.disconnectSlack({ locale, method, user })({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser: () => TE.left('unavailable'),
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          status: StatusCodes.ServiceUnavailable,
          title: expect.anything(),
          main: expect.anything(),
          skipToLabel: 'main',
          js: [],
        })
      },
    )
  })

  test.prop([fc.supportedLocale(), fc.string()])('when the user is not logged in', async (locale, method) => {
    const actual = await _.disconnectSlack({ locale, method, user: undefined })({
      deleteSlackUserId: shouldNotBeCalled,
      isSlackUser: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(disconnectSlackMatch.formatter, {}),
    })
  })
})
