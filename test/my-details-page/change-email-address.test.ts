import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/change-email-address'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeEmailAddress', () => {
  describe('when email addresses can be changed', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.user(),
      fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.emailAddress()),
    ])('when there is a logged in user', async (oauth, publicUrl, connection, user, emailAddress) => {
      const actual = await runMiddleware(
        _.changeEmailAddress({
          canChangeEmailAddress: true,
          getUser: () => M.fromEither(E.right(user)),
          publicUrl,
          oauth,
          deleteEmailAddress: shouldNotBeCalled,
          getEmailAddress: () => TE.fromEither(emailAddress),
          saveEmailAddress: shouldNotBeCalled,
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
        fc.emailAddress().chain(emailAddress =>
          fc.tuple(
            fc.constant(emailAddress),
            fc.connection({
              body: fc.constant({ emailAddress }),
              method: fc.constant('POST'),
            }),
          ),
        ),
        fc.user(),
        fc.emailAddress(),
      ])(
        'there is an email address already',
        async (oauth, publicUrl, [emailAddress, connection], user, existingEmailAddress) => {
          const saveEmailAddress = jest.fn<_.Env['saveEmailAddress']>(_ => TE.right(undefined))

          const actual = await runMiddleware(
            _.changeEmailAddress({
              canChangeEmailAddress: true,
              getUser: () => M.right(user),
              publicUrl,
              oauth,
              deleteEmailAddress: shouldNotBeCalled,
              getEmailAddress: () => TE.right(existingEmailAddress),
              saveEmailAddress,
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
          expect(saveEmailAddress).toHaveBeenCalledWith(user.orcid, emailAddress)
        },
      )

      test.prop([
        fc.oauth(),
        fc.origin(),
        fc.emailAddress().chain(emailAddress =>
          fc.tuple(
            fc.constant(emailAddress),
            fc.connection({
              body: fc.constant({ emailAddress }),
              method: fc.constant('POST'),
            }),
          ),
        ),
        fc.user(),
      ])("there isn't an email address already", async (oauth, publicUrl, [emailAddress, connection], user) => {
        const saveEmailAddress = jest.fn<_.Env['saveEmailAddress']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeEmailAddress({
            canChangeEmailAddress: true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteEmailAddress: shouldNotBeCalled,
            getEmailAddress: () => TE.left('not-found'),
            saveEmailAddress,
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
        expect(saveEmailAddress).toHaveBeenCalledWith(user.orcid, emailAddress)
      })
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({
        body: fc.record({ emailAddress: fc.nonEmptyString() }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.emailAddress()),
    ])('it is not an email address', async (oauth, publicUrl, connection, user, emailAddress) => {
      const actual = await runMiddleware(
        _.changeEmailAddress({
          canChangeEmailAddress: true,
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteEmailAddress: shouldNotBeCalled,
          getEmailAddress: () => TE.fromEither(emailAddress),
          saveEmailAddress: shouldNotBeCalled,
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
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({
        body: fc.record({ emailAddress: fc.emailAddress() }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.emailAddress()),
    ])(
      'when the form has been submitted but the email address cannot be saved',
      async (oauth, publicUrl, connection, user, emailAddress) => {
        const actual = await runMiddleware(
          _.changeEmailAddress({
            canChangeEmailAddress: true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteEmailAddress: () => TE.left('unavailable'),
            getEmailAddress: () => TE.fromEither(emailAddress),
            saveEmailAddress: () => TE.left('unavailable'),
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
        body: fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
      fc.user(),
    ])(
      'when the form has been submitted without setting an email address',
      async (oauth, publicUrl, connection, user) => {
        const deleteEmailAddress = jest.fn<_.Env['deleteEmailAddress']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeEmailAddress({
            canChangeEmailAddress: true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteEmailAddress,
            getEmailAddress: shouldNotBeCalled,
            saveEmailAddress: shouldNotBeCalled,
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
        expect(deleteEmailAddress).toHaveBeenCalledWith(user.orcid)
      },
    )

    test.prop([fc.oauth(), fc.origin(), fc.connection()])(
      'when the user is not logged in',
      async (oauth, publicUrl, connection) => {
        const actual = await runMiddleware(
          _.changeEmailAddress({
            canChangeEmailAddress: true,
            getUser: () => M.left('no-session'),
            publicUrl,
            oauth,
            deleteEmailAddress: shouldNotBeCalled,
            getEmailAddress: shouldNotBeCalled,
            saveEmailAddress: shouldNotBeCalled,
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
          _.changeEmailAddress({
            canChangeEmailAddress: true,
            getUser: () => M.left(error),
            oauth,
            publicUrl,
            deleteEmailAddress: shouldNotBeCalled,
            getEmailAddress: shouldNotBeCalled,
            saveEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.either(fc.constant('no-session' as const), fc.user())])(
    "when email addresses can't be changed",
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeEmailAddress({
          canChangeEmailAddress: false,
          getUser: () => M.fromEither(user),
          publicUrl,
          oauth,
          deleteEmailAddress: shouldNotBeCalled,
          getEmailAddress: shouldNotBeCalled,
          saveEmailAddress: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})
