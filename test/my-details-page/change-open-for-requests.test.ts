import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { EditOpenForRequestsEnv } from '../../src/is-open-for-requests'
import * as _ from '../../src/my-details-page/change-open-for-requests'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeOpenForRequests', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.isOpenForRequests()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, openForRequests) => {
    const actual = await runMiddleware(
      _.changeOpenForRequests({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        isOpenForRequests: () => TE.fromEither(openForRequests),
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

  describe('when the form has been submitted', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.constantFrom('yes' as const, 'no' as const).chain(openForRequests =>
        fc.tuple(
          fc.constant(openForRequests),
          fc.connection({
            body: fc.constant({ openForRequests }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
      fc.isOpenForRequests(),
    ])(
      'there is open for requests already',
      async (oauth, publicUrl, [openForRequests, connection], user, existingOpenForRequests) => {
        const saveOpenForRequests = jest.fn<EditOpenForRequestsEnv['saveOpenForRequests']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeOpenForRequests({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            isOpenForRequests: () => TE.right(existingOpenForRequests),
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
        expect(saveOpenForRequests).toHaveBeenCalledWith(
          user.orcid,
          openForRequests === 'yes'
            ? {
                value: true,
                visibility: existingOpenForRequests.value ? existingOpenForRequests.visibility : 'restricted',
              }
            : { value: false },
        )
      },
    )

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.constantFrom('yes', 'no').chain(openForRequests =>
        fc.tuple(
          fc.constant(openForRequests),
          fc.connection({
            body: fc.constant({ openForRequests }),
            method: fc.constant('POST'),
          }),
        ),
      ),
      fc.user(),
    ])("there isn't open for requests already", async (oauth, publicUrl, [openForRequests, connection], user) => {
      const saveOpenForRequests = jest.fn<EditOpenForRequestsEnv['saveOpenForRequests']>(_ => TE.right(undefined))

      const actual = await runMiddleware(
        _.changeOpenForRequests({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          isOpenForRequests: () => TE.left('not-found'),
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
      expect(saveOpenForRequests).toHaveBeenCalledWith(
        user.orcid,
        openForRequests === 'yes'
          ? {
              value: true,
              visibility: 'restricted',
            }
          : { value: false },
      )
    })
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({
      body: fc.record({ openForRequests: fc.constantFrom('yes', 'no') }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.either(fc.constant('not-found' as const), fc.isOpenForRequests()),
  ])(
    'when the form has been submitted but open for requests cannot be saved',
    async (oauth, publicUrl, connection, user, openForRequests) => {
      const actual = await runMiddleware(
        _.changeOpenForRequests({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          isOpenForRequests: () => TE.fromEither(openForRequests),
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
      body: fc.record({ openForRequests: fc.lorem() }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
  ])(
    'when the form has been submitted without setting open for requests',
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeOpenForRequests({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          isOpenForRequests: shouldNotBeCalled,
          saveOpenForRequests: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeOpenForRequests({
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

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, error) => {
      const actual = await runMiddleware(
        _.changeOpenForRequests({
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
