import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import * as _ from '../../src/my-details-page/verify-contact-email-address'
import { myDetailsMatch, verifyContactEmailAddressMatch } from '../../src/routes'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'

describe('verifyContactEmailAddress', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
  ])('when the email address is unverified', async (oauth, publicUrl, connection, user, contactEmailAddress) => {
    const getContactEmailAddress = jest.fn<_.Env['getContactEmailAddress']>(_ => TE.right(contactEmailAddress))
    const saveContactEmailAddress = jest.fn<_.Env['saveContactEmailAddress']>(_ => TE.right(undefined))

    const actual = await runMiddleware(
      _.verifyContactEmailAddress(contactEmailAddress.verificationToken)({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress,
        saveContactEmailAddress,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        { type: 'setHeader', name: 'Location', value: format(myDetailsMatch.formatter, {}) },
        { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'contact-email-verified' },
        { type: 'endResponse' },
      ]),
    )
    expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
    expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
      type: 'verified',
      value: contactEmailAddress.value,
    })
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.uuid(),
    fc.verifiedContactEmailAddress(),
  ])(
    'when the email address is already verified',
    async (oauth, publicUrl, connection, user, id, contactEmailAddress) => {
      const actual = await runMiddleware(
        _.verifyContactEmailAddress(id)({
          getUser: () => M.fromEither(E.right(user)),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
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

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.uuid(),
    fc.unverifiedContactEmailAddress(),
  ])(
    "when the verification token doesn't match",
    async (oauth, publicUrl, connection, user, id, contactEmailAddress) => {
      const actual = await runMiddleware(
        _.verifyContactEmailAddress(id)({
          getUser: () => M.fromEither(E.right(user)),
          publicUrl,
          oauth,
          deleteContactEmailAddress: shouldNotBeCalled,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
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

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.uuid(),
  ])('when there is no email address', async (oauth, publicUrl, connection, user, id) => {
    const actual = await runMiddleware(
      _.verifyContactEmailAddress(id)({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.left('not-found'),
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
  })

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
    fc.user(),
    fc.uuid(),
  ])("when the email address can't be loaded", async (oauth, publicUrl, connection, user, id) => {
    const actual = await runMiddleware(
      _.verifyContactEmailAddress(id)({
        getUser: () => M.fromEither(E.right(user)),
        publicUrl,
        oauth,
        deleteContactEmailAddress: shouldNotBeCalled,
        getContactEmailAddress: () => TE.left('unavailable'),
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
  })

  test.prop([fc.oauth(), fc.origin(), fc.connection(), fc.uuid()])(
    'when the user is not logged in',
    async (oauth, publicUrl, connection, id) => {
      const actual = await runMiddleware(
        _.verifyContactEmailAddress(id)({
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
                state: new URL(format(verifyContactEmailAddressMatch.formatter, { verify: id }), publicUrl).toString(),
              }).toString()}`,
              oauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([fc.oauth(), fc.origin(), fc.connection({ method: fc.requestMethod() }), fc.uuid(), fc.error()])(
    "when the user can't be loaded",
    async (oauth, publicUrl, connection, id, error) => {
      const actual = await runMiddleware(
        _.verifyContactEmailAddress(id)({
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
})
