import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import type { GetContactEmailAddressEnv, SaveContactEmailAddressEnv } from '../../src/contact-email-address'
import { writeReviewMatch, writeReviewVerifyEmailAddressMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewVerifyEmailAddress', () => {
  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the email address is unverified',
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, contactEmailAddress) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
        TE.right(contactEmailAddress),
      )
      const saveContactEmailAddress = jest.fn<SaveContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
        TE.right(undefined),
      )

      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          contactEmailAddress.verificationToken,
        )({
          formStore,
          getContactEmailAddress,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.fromEither(E.right(user)),
          orcidOauth,
          publicUrl,
          saveContactEmailAddress,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          },
          { type: 'setCookie', name: 'flash-message', options: { httpOnly: true }, value: 'contact-email-verified' },
          { type: 'endResponse' },
        ]),
      )
      expect(getContactEmailAddress).toHaveBeenCalledWith(user.orcid)
      expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
        type: 'verified',
        value: contactEmailAddress.value,
      })
    },
  )

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.verifiedContactEmailAddress(),
    fc.uuid(),
  ])(
    'when the email address is already verified',
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, contactEmailAddress, id) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
    fc.uuid(),
  ])(
    "when the verification token doesn't match",
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, contactEmailAddress, id) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.uuid(),
  ])(
    'when there is no email address',
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, id) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.form(),
    fc.user(),
    fc.uuid(),
  ])(
    "when the email address can't be loaded",
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, newReview, user, id) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore,
          getContactEmailAddress: () => TE.left('unavailable'),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.user(),
    fc.uuid(),
  ])('when there is no form', async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, user, id) => {
    const actual = await runMiddleware(
      _.writeReviewVerifyEmailAddress(
        preprintId,
        id,
      )({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.right(preprintTitle),
        getUser: () => M.of(user),
        orcidOauth,
        publicUrl,
        saveContactEmailAddress: shouldNotBeCalled,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.oauth(), fc.origin(), fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.uuid()])(
    'when the preprint cannot be loaded',
    async (orcidOauth, publicUrl, preprintId, connection, user, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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

  test.prop([fc.oauth(), fc.origin(), fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.uuid()])(
    'when the preprint cannot be found',
    async (orcidOauth, publicUrl, preprintId, connection, user, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
          orcidOauth,
          publicUrl,
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

  test.prop([fc.oauth(), fc.origin(), fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.uuid()])(
    'when the user is not logged in',
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          orcidOauth,
          publicUrl,
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
                client_id: orcidOauth.clientId,
                response_type: 'code',
                redirect_uri: new URL('/orcid', publicUrl).toString(),
                scope: '/authenticate',
                state: new URL(
                  format(writeReviewVerifyEmailAddressMatch.formatter, { id: preprintTitle.id, verify: id }),
                  publicUrl,
                ).toString(),
              }).toString()}`,
              orcidOauth.authorizeUrl,
            ).href,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.oauth(),
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.uuid(),
    fc.error(),
  ])(
    "when the user can't be loaded",
    async (orcidOauth, publicUrl, preprintId, preprintTitle, connection, id, error) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left(error),
          orcidOauth,
          publicUrl,
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
