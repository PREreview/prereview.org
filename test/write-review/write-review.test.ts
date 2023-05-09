import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { GetPreprintEnv } from '../../src/preprint'
import { writeReviewStartMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
      ),
      fc.oneof(
        fc.record(
          {
            alreadyWritten: fc.constantFrom('yes', 'no'),
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.lorem(),
          },
          { withDeletedKeys: true },
        ),
        fc.constant({}),
      ),
      fc.user(),
    ])('there is a form already', async (preprintId, preprint, connection, newReview, user) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprint.id), newReview)
      const getPreprint: Mock<GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))

      const actual = await runMiddleware(
        _.writeReview(preprintId)({
          formStore,
          getPreprint,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewStartMatch.formatter, { id: preprint.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprint).toHaveBeenCalledWith(preprintId)
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
      ),
      fc.user(),
    ])("there isn't a form", async (preprintId, preprint, connection, user) => {
      const formStore = new Keyv()
      const getPreprint = () => TE.right(preprint)

      const actual = await runMiddleware(
        _.writeReview(preprintId)({
          formStore,
          getPreprint,
          getUser: () => M.of(user),
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (preprintId, preprint, connection) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.right(preprint)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.left('no-session'),
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
    fc.indeterminatePreprintId(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.fromEither(user),
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint is not found', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.fromEither(user),
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
})
