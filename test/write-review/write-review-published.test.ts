import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch } from '../../src/routes'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import { PublishedReviewC } from '../../src/write-review/published-review'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewPublished', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.origin(),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
    fc.doi(),
  ])(
    'when the form is complete',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      publicUrl,
      publishedReview,
      user,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          publicUrl,
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(await sessionStore.get(sessionId)).toStrictEqual({ user: UserC.encode(user) })
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
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
  ])(
    'when there is no published review',
    async (preprintId, preprintTitle, [connection, sessionCookie, sessionId, secret], user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle,
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
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
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintId, [connection, sessionCookie, sessionId, secret], publishedReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const getPreprintTitle = () => TE.left('unavailable' as const)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle,
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
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
    fc.indeterminatePreprintId(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.record({ doi: fc.doi(), form: fc.completedForm(), id: fc.integer() }),
    fc.user(),
  ])(
    'when the preprint cannot be found',
    async (preprintId, [connection, sessionCookie, sessionId, secret], publishedReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const getPreprintTitle = () => TE.left('not-found' as const)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle,
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.cookieName(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, sessionCookie, secret) => {
      const sessionStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle,
          getUser: () => M.left('no-session'),
          publicUrl: new URL('http://example.com'),
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
            value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})
