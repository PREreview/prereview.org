import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import type { EditContactEmailAddressEnv, VerifyContactEmailAddressForReviewEnv } from '../../src/contact-email-address'
import type { RequiresVerifiedEmailAddressEnv } from '../../src/feature-flags'
import { writeReviewMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewEnterEmailAddress', () => {
  describe('when a verified email address is required', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.verifiedContactEmailAddress(),
    ])(
      'when the user has a verified email address',
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
        const requiresVerifiedEmailAddress = jest.fn<RequiresVerifiedEmailAddressEnv['requiresVerifiedEmailAddress']>(
          _ => true,
        )

        const actual = await runMiddleware(
          _.writeReviewEnterEmailAddress(preprintId)({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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
        expect(requiresVerifiedEmailAddress).toHaveBeenCalledWith(user)
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection(),
      fc.form(),
      fc.user(),
      fc.either(fc.constant('not-found' as const), fc.unverifiedContactEmailAddress()),
    ])(
      'when the user needs to verify their email address',
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewEnterEmailAddress(preprintId)({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            generateUuid: shouldNotBeCalled,
            getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .emailAddress()
        .chain(emailAddress =>
          fc.tuple(
            fc.connection({ body: fc.constant({ emailAddress }), method: fc.constant('POST') }),
            fc.constant(emailAddress),
          ),
        ),
      fc.uuid(),
      fc.user(),
      fc.form(),
    ])(
      'when an email address is given',
      async (preprintId, preprintTitle, [connection, emailAddress], verificationToken, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
        const saveContactEmailAddress = jest.fn<EditContactEmailAddressEnv['saveContactEmailAddress']>(_ =>
          TE.right(undefined),
        )
        const verifyContactEmailAddressForReview = jest.fn<
          VerifyContactEmailAddressForReviewEnv['verifyContactEmailAddressForReview']
        >(_ => TE.right(undefined))

        const actual = await runMiddleware(
          _.writeReviewEnterEmailAddress(preprintId)({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            generateUuid: () => verificationToken,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
            saveContactEmailAddress,
            verifyContactEmailAddressForReview,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprintTitle.id }),
            },
            { type: 'endResponse' },
          ]),
        )
        expect(saveContactEmailAddress).toHaveBeenCalledWith(user.orcid, {
          type: 'unverified',
          value: emailAddress,
          verificationToken,
        })
        expect(verifyContactEmailAddressForReview).toHaveBeenCalledWith(
          user,
          {
            type: 'unverified',
            value: emailAddress,
            verificationToken,
          },
          preprintTitle.id,
        )
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection({
        body: fc.record({
          emailAddress: fc
            .string()
            .filter(string => !string.includes('.') || !string.includes('@') || string === '' || /\s/g.test(string)),
        }),
        method: fc.constant('POST'),
      }),
      fc.uuid(),
      fc.user(),
      fc.form(),
    ])(
      "when an email address isn't given",
      async (preprintId, preprintTitle, connection, verificationToken, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewEnterEmailAddress(preprintId)({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            generateUuid: () => verificationToken,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
      'when there is no form',
      async (preprintId, preprintTitle, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewEnterEmailAddress(preprintId)({
            deleteContactEmailAddress: shouldNotBeCalled,
            formStore: new Keyv(),
            getContactEmailAddress: shouldNotBeCalled,
            generateUuid: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
            saveContactEmailAddress: shouldNotBeCalled,
            verifyContactEmailAddressForReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
    "when a verified email address isn't required",
    async (preprintId, preprintTitle, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: () => false,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be found',
    async (preprintId, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection) => {
      const actual = await runMiddleware(
        _.writeReviewEnterEmailAddress(preprintId)({
          deleteContactEmailAddress: shouldNotBeCalled,
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          generateUuid: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
          saveContactEmailAddress: shouldNotBeCalled,
          verifyContactEmailAddressForReview: shouldNotBeCalled,
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
