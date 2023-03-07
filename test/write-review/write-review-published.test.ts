import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import all from 'it-all'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import { PublishedReviewC } from '../../src/write-review/published-review'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewPublished', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({
            Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}`,
          }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),

        fc.constant(secret),
      ),
    ),
    fc.record({ doi: fc.doi(), form: fc.completedForm() }),
    fc.user(),
    fc.doi(),
  ])(
    'when the form is complete',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], publishedReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintDoi)({
          getPreprintTitle,
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      const sessions = await all(sessionStore.iterator(undefined))

      expect(sessions).toStrictEqual([])
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'clearCookie', name: sessionCookie, options: expect.anything() },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
  ])(
    'when there is no published review',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintDoi)({
          getPreprintTitle,
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview`,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({
            Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}`,
          }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),

        fc.constant(secret),
      ),
    ),
    fc.record({ doi: fc.doi(), form: fc.completedForm() }),
    fc.user(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], publishedReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const getPreprintTitle = () => TE.left('unavailable' as const)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintDoi)({
          getPreprintTitle,
          secret,
          sessionCookie,
          sessionStore,
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
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({
            Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}`,
          }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),

        fc.constant(secret),
      ),
    ),
    fc.record({ doi: fc.doi(), form: fc.completedForm() }),
    fc.user(),
  ])(
    'when the preprint cannot be found',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], publishedReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const getPreprintTitle = () => TE.left('not-found' as const)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintDoi)({
          getPreprintTitle,
          secret,
          sessionCookie,
          sessionStore,
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
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.connection({ method: fc.constant('POST') }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, sessionCookie, secret) => {
    const sessionStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPublished(preprintDoi)({
        getPreprintTitle,
        secret,
        sessionCookie,
        sessionStore,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: `/preprints/doi-${encodeURIComponent(
            preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
          )}/write-a-prereview`,
        },
        { type: 'endResponse' },
      ]),
    )
  })
})
