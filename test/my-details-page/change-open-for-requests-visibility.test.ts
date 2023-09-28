import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { EditOpenForRequestsEnv } from '../../src/is-open-for-requests'
import * as _ from '../../src/my-details-page/change-open-for-requests-visibility'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeOpenForRequestsVisibility', () => {
  describe('when open for requests', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.user(),
      fc.isOpenForRequestsVisibility(),
    ])('when there is a logged in user', async (oauth, publicUrl, connection, user, visibility) => {
      const actual = await runMiddleware(
        _.changeOpenForRequestsVisibility({
          getUser: () => M.fromEither(E.right(user)),
          publicUrl,
          oauth,
          isOpenForRequests: () => TE.of({ value: true, visibility }),
          saveOpenForRequests: shouldNotBeCalled,
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
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.isOpenForRequestsVisibility().chain(visibility =>
        fc.tuple(
          fc.constant(visibility),
          fc.connection({
            body: fc.constant({ openForRequestsVisibility: visibility }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
      fc.isOpenForRequestsVisibility(),
    ])(
      'when the form has been submitted',
      async (oauth, publicUrl, [visibility, connection], user, existingVisibility) => {
        const saveOpenForRequests = jest.fn<EditOpenForRequestsEnv['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeOpenForRequestsVisibility({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            isOpenForRequests: () => TE.right({ value: true, visibility: existingVisibility }),
            saveOpenForRequests,
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
        expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility })
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({
        body: fc.record({ openForRequestsVisibility: fc.isOpenForRequestsVisibility() }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.isOpenForRequestsVisibility(),
    ])(
      'when the form has been submitted but the visibility cannot be saved',
      async (oauth, publicUrl, connection, user, visibility) => {
        const actual = await runMiddleware(
          _.changeOpenForRequestsVisibility({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            isOpenForRequests: () => TE.of({ value: true, visibility }),
            saveOpenForRequests: () => TE.left('unavailable'),
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

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({
        body: fc.record({ openForRequestsVisibility: fc.string() }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.isOpenForRequestsVisibility(),
    ])(
      'when the form has been submitted without setting visibility',
      async (oauth, publicUrl, connection, user, visibility) => {
        const saveOpenForRequests = jest.fn<EditOpenForRequestsEnv['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeOpenForRequestsVisibility({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            isOpenForRequests: () => TE.of({ value: true, visibility }),
            saveOpenForRequests,
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
        expect(saveOpenForRequests).toHaveBeenCalledWith(user.orcid, { value: true, visibility: 'restricted' })
      },
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.user()])(
    'when not open to requests',
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeOpenForRequestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          isOpenForRequests: () => TE.of({ value: false }),
          saveOpenForRequests: shouldNotBeCalled,
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

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.user()])(
    "there isn't open to requests",
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeOpenForRequestsVisibility({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          isOpenForRequests: () => TE.left('not-found'),
          saveOpenForRequests: shouldNotBeCalled,
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

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeOpenForRequestsVisibility({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          isOpenForRequests: shouldNotBeCalled,
          saveOpenForRequests: shouldNotBeCalled,
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
                state: new URL(format(myDetailsMatch.formatter, {}), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeOpenForRequestsVisibility({
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          isOpenForRequests: shouldNotBeCalled,
          saveOpenForRequests: shouldNotBeCalled,
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
