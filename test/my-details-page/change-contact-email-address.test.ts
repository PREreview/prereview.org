import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import type { CanChangeContactEmailAddressEnv } from '../../src/feature-flags'
import * as _ from '../../src/my-details-page/change-contact-email-address'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeContactEmailAddress', () => {
  describe('when email addresses can be changed', () => {
    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
      fc.user(),
      fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.contactEmailAddress()),
    ])('when there is a logged in user', async (oauth, publicUrl, connection, user, emailAddress) => {
      const canChangeContactEmailAddress = jest.fn<CanChangeContactEmailAddressEnv['canChangeContactEmailAddress']>(
        _ => true,
      )

      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          canChangeContactEmailAddress,
          getUser: () => M.fromEither(E.right(user)),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(emailAddress),
          saveContactEmailAddress: shouldNotBeCalled,
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
        fc.contactEmailAddress(),
      ])(
        'there is an email address already',
        async (oauth, publicUrl, [emailAddress, connection], user, existingEmailAddress) => {
          const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

          const actual = await runMiddleware(
            _.changeContactEmailAddress({
              canChangeContactEmailAddress: () => true,
              getUser: () => M.right(user),
              publicUrl,
              oauth,
              deleteContactEmailAddress: shouldNotBeCalled,
              getContactEmailAddress: () => TE.right(existingEmailAddress),
              saveContactEmailAddress,
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
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, { type: 'unverified', value: emailAddress })
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
        const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            canChangeContactEmailAddress: () => true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.left('not-found'),
            saveContactEmailAddress,
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
        expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, { type: 'unverified', value: emailAddress })
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
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
    ])('it is not an email address', async (oauth, publicUrl, connection, user, emailAddress) => {
      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          canChangeContactEmailAddress: () => true,
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(emailAddress),
          saveContactEmailAddress: shouldNotBeCalled,
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
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
    ])(
      'when the form has been submitted but the email address cannot be saved',
      async (oauth, publicUrl, connection, user, emailAddress) => {
        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            canChangeContactEmailAddress: () => true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteContactEmailAddress: () => TE.left('unavailable'),
            getContactEmailAddress: () => TE.fromEither(emailAddress),
            saveContactEmailAddress: () => TE.left('unavailable'),
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
        const deleteContactEmailAddress = jest.fn<_.Env['deleteContactEmailAddress']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            canChangeContactEmailAddress: () => true,
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            deleteContactEmailAddress,
            getContactEmailAddress: shouldNotBeCalled,
            saveContactEmailAddress: shouldNotBeCalled,
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
        expect(deleteContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      },
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          canChangeContactEmailAddress: shouldNotBeCalled,
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
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
        _.changeContactEmailAddress({
          canChangeContactEmailAddress: shouldNotBeCalled,
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.user()])(
    "when email addresses can't be changed",
    async (oauth, publicUrl, connection, user) => {
      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          canChangeContactEmailAddress: () => false,
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
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
