import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/change-contact-email-address'
import { myDetailsMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('changeContactEmailAddress', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.either(fc.constantFrom('not-found' as const, 'unavailable' as const), fc.contactEmailAddress()),
  ])('when there is a logged in user', async (oauth, publicUrl, connection, user, emailAddress) => {
    const actual = await runMiddleware(
      _.changeContactEmailAddress({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        generateUuid: shouldNotBeCalled,
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.fromEither(emailAddress),
        saveContactEmailAddress: shouldNotBeCalled,
        verifyContactEmailAddress: shouldNotBeCalled,
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
    describe('when an email address is given', () => {
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
        fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
        fc.uuid(),
      ])(
        'when it is different to the previous value',
        async (oauth, publicUrl, [emailAddress, connection], user, existingEmailAddress, verificationToken) => {
          const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))
          const verifyContactEmailAddress = jest.fn<_.Env['verifyContactEmailAddress']>(_ => TE.right(undefined))

          const actual = await runMiddleware(
            _.changeContactEmailAddress({
              getUser: () => M.right(user),
              publicUrl,
              oauth,
              generateUuid: () => verificationToken,
              deleteContactEmailAddress: shouldNotBeCalled,
              getContactEmailAddress: () => TE.fromEither(existingEmailAddress),
              saveContactEmailAddress,
              verifyContactEmailAddress,
            }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.SeeOther },
              { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
              {
                type: 'setCookie',
                name: 'flash-message',
                options: { httpOnly: true },
                value: 'verify-contact-email',
              },
              { type: 'endResponse' },
            ]),
          )
          expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
            type: 'unverified',
            value: emailAddress,
            verificationToken,
          })
          expect(verifyContactEmailAddress).toHaveBeenCalledWith(user, {
            type: 'unverified',
            value: emailAddress,
            verificationToken,
          })
        },
      )

      test.prop([
        fc.oauth(),
        fc.origin(),
        fc.contactEmailAddress().chain(existingEmailAddress =>
          fc.tuple(
            fc.constant(existingEmailAddress),
            fc.connection({
              body: fc.constant({ emailAddress: existingEmailAddress.value }),
              method: fc.constant('POST'),
            }),
          ),
        ),
        fc.user(),
      ])(
        'when it is the same as the previous value',
        async (oauth, publicUrl, [existingEmailAddress, connection], user) => {
          const actual = await runMiddleware(
            _.changeContactEmailAddress({
              getUser: () => M.right(user),
              publicUrl,
              oauth,
              generateUuid: shouldNotBeCalled,
              deleteContactEmailAddress: shouldNotBeCalled,
              getContactEmailAddress: () => TE.right(existingEmailAddress),
              saveContactEmailAddress: shouldNotBeCalled,
              verifyContactEmailAddress: shouldNotBeCalled,
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
    })

    test.prop([
      fc.oauth(),
      fc.origin(),
      fc.connection({
        body: fc.record({
          emailAddress: fc
            .nonEmptyString()
            .filter(string => !string.includes('.') || !string.includes('@') || /\s/g.test(string)),
        }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
    ])('it is not an email address', async (oauth, publicUrl, connection, user, emailAddress) => {
      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          getUser: () => M.right(user),
          publicUrl,
          oauth,
          generateUuid: shouldNotBeCalled,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: () => TE.fromEither(emailAddress),
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddress: shouldNotBeCalled,
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
      fc.uuid(),
    ])(
      'the email address cannot be saved',
      async (oauth, publicUrl, connection, user, emailAddress, verificationToken) => {
        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            generateUuid: () => verificationToken,
            deleteContactEmailAddress: () => TE.left('unavailable'),
            getContactEmailAddress: () => TE.fromEither(emailAddress),
            saveContactEmailAddress: () => TE.left('unavailable'),
            verifyContactEmailAddress: shouldNotBeCalled,
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
        body: fc.record({ emailAddress: fc.emailAddress() }),
        method: fc.constant('POST'),
      }),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
      fc.uuid(),
    ])(
      'the verification email cannot be sent',
      async (oauth, publicUrl, connection, user, emailAddress, verificationToken) => {
        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            generateUuid: () => verificationToken,
            deleteContactEmailAddress: () => shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(emailAddress),
            saveContactEmailAddress: () => TE.right(undefined),
            verifyContactEmailAddress: () => TE.left('unavailable'),
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

    describe('when no email address is set', () => {
      test.prop([
        fc.oauth(),
        fc.origin(),
        fc.connection({
          body: fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }),
          method: fc.constant('POST'),
        }),
        fc.user(),
        fc.contactEmailAddress(),
      ])('when there was an email address before', async (oauth, publicUrl, connection, user, existingEmailAddress) => {
        const deleteContactEmailAddress = jest.fn<_.Env['deleteContactEmailAddress']>(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress,
            getContactEmailAddress: () => TE.right(existingEmailAddress),
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
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
      })

      test.prop([
        fc.oauth(),
        fc.origin(),
        fc.connection({
          body: fc.record({ emailAddress: fc.constant('') }, { withDeletedKeys: true }),
          method: fc.constant('POST'),
        }),
        fc.user(),
      ])("when there wasn't an email address before", async (oauth, publicUrl, connection, user) => {
        const actual = await runMiddleware(
          _.changeContactEmailAddress({
            getUser: () => M.right(user),
            publicUrl,
            oauth,
            generateUuid: shouldNotBeCalled,
            deleteContactEmailAddress: shouldNotBeCalled,
            getContactEmailAddress: () => TE.left('not-found'),
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddress: shouldNotBeCalled,
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
      })
    })
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection) => {
      const actual = await runMiddleware(
        _.changeContactEmailAddress({
          getUser: () => M.left('no-session'),
          publicUrl,
          oauth,
          generateUuid: shouldNotBeCalled,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddress: shouldNotBeCalled,
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
          getUser: () => M.left(error),
          oauth,
          publicUrl,
          generateUuid: shouldNotBeCalled,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddress: shouldNotBeCalled,
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
