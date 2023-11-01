import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../src/disconnect-slack'
import { disconnectSlackMatch, myDetailsMatch } from '../src/routes'
import type { IsSlackUserEnv } from '../src/slack-user'
import type { DeleteSlackUserIdEnv } from '../src/slack-user-id'
import * as fc from './fc'
import { runMiddleware } from './middleware'
import { shouldNotBeCalled } from './should-not-be-called'

describe('disconnectSlack', () => {
  describe('when the user is logged in', () => {
    test.prop([
      fc.oauth(),
      fc.user(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    ])('when Slack is connected', async (oauth, user, connection) => {
      const isSlackUser = jest.fn<IsSlackUserEnv['isSlackUser']>(_ => TE.right(true))

      const actual = await runMiddleware(
        _.disconnectSlack({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser,
          getUser: () => M.of(user),
          oauth,
          publicUrl: new URL('http://example.com'),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
      expect(isSlackUser).toHaveBeenCalledWith(user.orcid)
    })

    test.prop([fc.oauth(), fc.user(), fc.connection({ method: fc.constant('POST') })])(
      'when the form is submitted',
      async (oauth, user, connection) => {
        const deleteSlackUserId = jest.fn<DeleteSlackUserIdEnv['deleteSlackUserId']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.disconnectSlack({
            deleteSlackUserId,
            isSlackUser: () => TE.right(true),
            getUser: () => M.of(user),
            oauth,
            publicUrl: new URL('http://example.com'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
            { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'slack-disconnected' },
            { type: 'endResponse' },
          ]),
        )
        expect(deleteSlackUserId).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.connection()])(
      'when Slack is not connected',
      async (oauth, user, connection) => {
        const actual = await runMiddleware(
          _.disconnectSlack({
            deleteSlackUserId: shouldNotBeCalled,
            isSlackUser: () => TE.right(false),
            getUser: () => M.of(user),
            oauth,
            publicUrl: new URL('http://example.com'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
            { type: 'endResponse' },
          ]),
        )
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.connection({ method: fc.constant('POST') })])(
      "when Slack user can't be disconnected",
      async (oauth, user, connection) => {
        const actual = await runMiddleware(
          _.disconnectSlack({
            deleteSlackUserId: () => TE.left('unavailable'),
            isSlackUser: () => TE.right(true),
            getUser: () => M.of(user),
            oauth,
            publicUrl: new URL('http://example.com'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.ServiceUnavailable },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )

    test.prop([fc.oauth(), fc.user(), fc.connection()])(
      "when the Slack user can't be loaded",
      async (oauth, user, connection) => {
        const actual = await runMiddleware(
          _.disconnectSlack({
            deleteSlackUserId: shouldNotBeCalled,
            isSlackUser: () => TE.left('unavailable'),
            getUser: () => M.of(user),
            oauth,
            publicUrl: new URL('http://example.com'),
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.ServiceUnavailable },
            { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
            { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
            { type: 'setBody', body: expect.anything() },
          ]),
        )
      },
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.disconnectSlack({
          deleteSlackUserId: shouldNotBeCalled,
          isSlackUser: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          oauth,
          publicUrl,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.Found },
          {
            type: 'setHeader',
            name: 'Location',
            value: new URL(
              `?${new URLSearchParams({
                client_id: oauth.clientId,
                response_type: 'code',
                redirect_uri: oauth.redirectUri.href,
                scope: '/authenticate',
                state: new URL(format(disconnectSlackMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})
