import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import type { EditContactEmailAddressEnv, GetContactEmailAddressEnv } from '../../src/contact-email-address'
import type { RequiresVerifiedEmailAddressEnv } from '../../src/feature-flags'
import { writeReviewMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewVerifyEmailAddress', () => {
  describe('when a verified email address is required', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.unverifiedContactEmailAddress(),
    ])(
      'when the email address is unverified',
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
        const requiresVerifiedEmailAddress = jest.fn<RequiresVerifiedEmailAddressEnv['requiresVerifiedEmailAddress']>(
          _ => true,
        )
        const getContactEmailAddress = jest.fn<GetContactEmailAddressEnv['getContactEmailAddress']>(_ =>
          TE.right(contactEmailAddress),
        )
        const saveContactEmailAddress = jest.fn<EditContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
          TE.right(undefined),
        )

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            contactEmailAddress.verificationToken,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.fromEither(E.right(user)),
            requiresVerifiedEmailAddress,
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
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.verifiedContactEmailAddress(),
      fc.uuid(),
    ])(
      'when the email address is already verified',
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress, id) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            id,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.unverifiedContactEmailAddress(),
      fc.uuid(),
    ])(
      "when the verification token doesn't match",
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress, id) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            id,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.form(), fc.user(), fc.uuid()])(
      'when there is no email address',
      async (preprintId, preprintTitle, connection, newReview, user, id) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            id,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.form(), fc.user(), fc.uuid()])(
      "when the email address can't be loaded",
      async (preprintId, preprintTitle, connection, newReview, user, id) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            id,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.left('unavailable'),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.uuid()])(
      'when there is no form',
      async (preprintId, preprintTitle, connection, user, id) => {
        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(
            preprintId,
            id,
          )({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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
      },
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user(), fc.uuid()])(
    "when a verified email address isn't required",
    async (preprintId, preprintTitle, connection, user, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: () => false,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.uuid()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user(), fc.uuid()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.uuid()])(
    'when the user is not logged in',
    async (preprintId, preprintTitle, connection, id) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.uuid(), fc.error()])(
    "when the user can't be loaded",
    async (preprintId, preprintTitle, connection, id, error) => {
      const actual = await runMiddleware(
        _.writeReviewVerifyEmailAddress(
          preprintId,
          id,
        )({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left(error),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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
