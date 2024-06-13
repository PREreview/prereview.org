import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import { rawHtml } from '../../src/html.js'
import type { TemplatePageEnv } from '../../src/page.js'
import { writeReviewMatch } from '../../src/routes.js'
import { UserC } from '../../src/user.js'
import * as _ from '../../src/write-review/index.js'
import { PublishedReviewC } from '../../src/write-review/published-review.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

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
    fc.html(),
  ])(
    'when the form is complete',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      publicUrl,
      publishedReview,
      user,
      page,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          publicUrl,
          secret,
          sessionCookie,
          sessionStore,
          templatePage,
        }),
        connection,
      )()

      expect(await sessionStore.get(sessionId)).toStrictEqual({ user: UserC.encode(user) })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('published'),
        content: expect.stringContaining('published'),
        skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
        type: 'streamline',
        user,
      })
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

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
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
    fc.html(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintId, [connection, sessionCookie, sessionId, secret], publishedReview, user, page) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.left('unavailable'),
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
          secret,
          sessionCookie,
          sessionStore,
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('having problems'),
        content: expect.stringContaining('having problems'),
        skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
        user,
      })
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
    fc.html(),
  ])(
    'when the preprint cannot be found',
    async (preprintId, [connection, sessionCookie, sessionId, secret], publishedReview, user, page) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, {
        user: UserC.encode(user),
        'published-review': PublishedReviewC.encode(publishedReview),
      })
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.left('not-found'),
          getUser: () => M.of(user),
          publicUrl: new URL('http://example.com'),
          secret,
          sessionCookie,
          sessionStore,
          templatePage,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.NotFound },
          { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.stringContaining('not found'),
        content: expect.stringContaining('not found'),
        skipLinks: [[rawHtml('Skip to main content'), '#main-content']],
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.cookieName(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, sessionCookie, secret) => {
      const actual = await runMiddleware(
        _.writeReviewPublished(preprintId)({
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          publicUrl: new URL('http://example.com'),
          secret,
          sessionCookie,
          sessionStore: new Keyv(),
          templatePage: shouldNotBeCalled,
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
