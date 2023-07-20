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
import type { GetPreprintEnv } from '../../src/preprint'
import { writeReviewMatch, writeReviewStartMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReview', () => {
  describe('when there is a session', () => {
    test.prop([
      fc.origin(),
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
            alreadyWritten: fc.alreadyWritten(),
            competingInterests: fc.competingInterests(),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.conduct(),
            moreAuthors: fc.moreAuthors(),
            persona: fc.persona(),
            review: fc.lorem(),
          },
          { withDeletedKeys: true },
        ),
        fc.constant({}),
      ),
      fc.user(),
    ])('there is a form already', async (publicUrl, preprintId, preprint, connection, newReview, user) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprint.id), newReview)
      const getPreprint: Mock<GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))

      const actual = await runMiddleware(
        _.writeReview(preprintId)({
          formStore,
          getPreprint,
          getUser: () => M.of(user),
          publicUrl,
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
      fc.origin(),
      fc.indeterminatePreprintId(),
      fc.preprint(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.requestMethod().filter(method => method !== 'POST'),
        }),
      ),
      fc.user(),
    ])("there isn't a form", async (publicUrl, preprintId, preprint, connection, user) => {
      const formStore = new Keyv()
      const getPreprint = () => TE.right(preprint)

      const actual = await runMiddleware(
        _.writeReview(preprintId)({
          formStore,
          getPreprint,
          getUser: () => M.of(user),
          publicUrl,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          {
            type: 'setHeader',
            name: 'Link',
            value: `<${publicUrl.href.slice(0, -1)}${format(writeReviewMatch.formatter, {
              id: preprint.id,
            })}>; rel="canonical"`,
          },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    })
  })

  test.prop([
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.preprint(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (publicUrl, preprintId, preprint, connection) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.right(preprint)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.left('no-session'),
        publicUrl,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.OK },
        {
          type: 'setHeader',
          name: 'Link',
          value: `<${publicUrl.href.slice(0, -1)}${format(writeReviewMatch.formatter, {
            id: preprint.id,
          })}>; rel="canonical"`,
        },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

  test.prop([
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint cannot be loaded', async (publicUrl, preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.fromEither(user),
        publicUrl,
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
    fc.origin(),
    fc.indeterminatePreprintId(),
    fc.connection({
      headers: fc.constant({}),
      method: fc.requestMethod().filter(method => method !== 'POST'),
    }),
    fc.either(fc.constant('no-session' as const), fc.user()),
  ])('when the preprint is not found', async (publicUrl, preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprint = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReview(preprintId)({
        formStore,
        getPreprint,
        getUser: () => M.fromEither(user),
        publicUrl,
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
