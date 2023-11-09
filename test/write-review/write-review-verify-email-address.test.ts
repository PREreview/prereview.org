import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import type { RequiresVerifiedEmailAddressEnv } from '../../src/feature-flags'
import { changeContactEmailAddressMatch, writeReviewMatch } from '../../src/routes'
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
          _.writeReviewVerifyEmailAddress(preprintId)({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress,
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
      fc.unverifiedContactEmailAddress(),
    ])(
      'when the user needs to verify their email address',
      async (preprintId, preprintTitle, connection, newReview, user, contactEmailAddress) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(preprintId)({
            formStore,
            getContactEmailAddress: () => TE.right(contactEmailAddress),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.form(), fc.user()])(
      'when the user needs to give their email address',
      async (preprintId, preprintTitle, connection, newReview, user) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(preprintId)({
            formStore,
            getContactEmailAddress: () => TE.left('not-found'),
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            requiresVerifiedEmailAddress: () => true,
          }),
          connection,
        )()

        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: format(changeContactEmailAddressMatch.formatter, {}),
            },
            { type: 'endResponse' },
          ]),
        )
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
      'when there is no form',
      async (preprintId, preprintTitle, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewVerifyEmailAddress(preprintId)({
            getContactEmailAddress: shouldNotBeCalled,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
            formStore: new Keyv(),
            requiresVerifiedEmailAddress: () => true,
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
        _.writeReviewVerifyEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: () => false,
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
        _.writeReviewVerifyEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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
        _.writeReviewVerifyEmailAddress(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
          requiresVerifiedEmailAddress: () => false,
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
        _.writeReviewVerifyEmailAddress(preprintId)({
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          formStore: new Keyv(),
          requiresVerifiedEmailAddress: shouldNotBeCalled,
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
