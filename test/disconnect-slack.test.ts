import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import * as _ from '../src/disconnect-slack'
import { disconnectSlackMatch, myDetailsMatch } from '../src/routes'
import type { IsSlackUserEnv } from '../src/slack-user'
import type { DeleteSlackUserIdEnv } from '../src/slack-user-id'
import * as fc from './fc'
import { shouldNotBeCalled } from './should-not-be-called'

describe('disconnectSlack', () => {
  describe('when the user is logged in', () => {
    test.prop([fc.user(), fc.string().filter(method => method !== 'POST')])(
      'when Slack is connected',
      async (user, method) => {
        const isSlackUser = jest.fn<IsSlackUserEnv['isSlackUser']>(_ => TE.right(true))

        const actual = await _.disconnectSlack({ method, user })({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser,
        })()

        expect(actual).toStrictEqual({
          _tag: 'PageResponse',
          canonical: format(disconnectSlackMatch.formatter, {}),
          status: Status.OK,
          title: expect.stringContaining('Disconnect'),
          main: expect.stringContaining('Disconnect'),
          skipToLabel: 'main',
          js: [],
        })
        expect(isSlackUser).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([fc.user()])('when the form is submitted', async user => {
      const deleteSlackUserId = jest.fn<DeleteSlackUserIdEnv['deleteSlackUserId']>(_ => TE.right(undefined))

      const actual = await _.disconnectSlack({ method: 'POST', user })({
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

    test.prop([fc.user(), fc.string()])('when Slack is not connected', async (user, method) => {
      const actual = await _.disconnectSlack({ method, user })({
        deleteSlackUserId: shouldNotBeCalled,
        isSlackUser: () => TE.right(false),
      })()

      expect(actual).toStrictEqual({
        _tag: 'RedirectResponse',
        status: Status.SeeOther,
        location: format(myDetailsMatch.formatter, {}),
      })
    })

    test.prop([fc.user()])("when Slack user can't be disconnected", async user => {
      const actual = await _.disconnectSlack({ method: 'POST', user })({
        deleteSlackUserId: () => TE.left('unavailable'),
        isSlackUser: () => TE.right(true),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })

    test.prop([fc.user(), fc.string()])("when the Slack user can't be loaded", async (user, method) => {
      const actual = await _.disconnectSlack({ method, user })({
        deleteSlackUserId: shouldNotBeCalled,
        isSlackUser: () => TE.left('unavailable'),
      })()

      expect(actual).toStrictEqual({
        _tag: 'PageResponse',
        status: Status.ServiceUnavailable,
        title: expect.stringContaining('problems'),
        main: expect.stringContaining('problems'),
        skipToLabel: 'main',
        js: [],
      })
    })
  })

  test.prop([fc.string()])('when the user is not logged in', async method => {
    const actual = await _.disconnectSlack({ method, user: undefined })({
      deleteSlackUserId: shouldNotBeCalled,
      isSlackUser: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual({
      _tag: 'LogInResponse',
      location: format(disconnectSlackMatch.formatter, {}),
    })
  })
})
