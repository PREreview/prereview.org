import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware.js'
import Keyv from 'keyv'
import { merge } from 'ts-deepmerge'
import type { TemplatePageEnv } from '../../src/page.js'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../src/preprint.js'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../src/routes.js'
import { UserC } from '../../src/user.js'
import { CompletedFormC } from '../../src/write-review/completed-form.js'
import { FormC, formKey } from '../../src/write-review/form.js'
import * as _ from '../../src/write-review/index.js'
import { runMiddleware } from '../middleware.js'
import { shouldNotBeCalled } from '../should-not-be-called.js'
import * as fc from './fc.js'

describe('writeReviewPublish', () => {
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
    fc.completedForm(),
    fc.user(),
    fc.unverifiedContactEmailAddress(),
  ])(
    'when the user needs to verify their email address',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newReview,
      user,
      contactEmailAddress,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
            value: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
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
    fc.completedForm(),
    fc.user(),
  ])(
    'when the user needs to enter an email address',
    async (preprintId, preprintTitle, [connection, sessionCookie, sessionId, secret], newReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.left('not-found'),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
            value: format(writeReviewEnterEmailAddressMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
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
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.completedQuestionsForm(),
    fc.user(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
  ])(
    'when the form is complete with a questions-based review',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newReview,
      user,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(CompletedFormC.encode(newReview)))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()
      const session = await sessionStore.get(sessionId)

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.anything(),
        language: O.some('en'),
        structured: true,
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(session).toStrictEqual({
        user: UserC.encode(user),
        'published-review': { doi: reviewDoi, form: CompletedFormC.encode(newReview), id: reviewId },
      })
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
    },
  )
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
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
    fc.completedFreeformForm(),
    fc.user(),
    fc.verifiedContactEmailAddress(),
    fc.doi(),
    fc.integer(),
  ])(
    'when the form is complete with a freeform review',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newReview,
      user,
      contactEmailAddress,
      reviewDoi,
      reviewId,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const publishPrereview = jest.fn<_.PublishPrereviewEnv['publishPrereview']>(_ => TE.right([reviewDoi, reviewId]))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore,
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview,
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()
      const session = await sessionStore.get(sessionId)

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        otherAuthors: newReview.moreAuthors === 'yes' ? newReview.otherAuthors : [],
        persona: newReview.persona,
        preprint: preprintTitle,
        review: expect.stringContaining(newReview.review.toString()),
        language: expect.anything(),
        structured: false,
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishedMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(session).toStrictEqual({
        user: UserC.encode(user),
        'published-review': { doi: reviewDoi, form: FormC.encode(CompletedFormC.encode(newReview)), id: reviewId },
      })
      expect(await formStore.has(formKey(user.orcid, preprintTitle.id))).toBe(false)
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
    fc.incompleteForm(),
    fc.user(),
    fc.either(fc.constant('not-found'), fc.contactEmailAddress()),
  ])(
    'when the form is incomplete',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newPrereview,
      user,
      contactEmailAddress,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newPrereview))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          getContactEmailAddress: () => TE.fromEither(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          formStore,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
            value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          },
          { type: 'endResponse' },
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
    'when there is no form',
    async (preprintId, preprintTitle, [connection, sessionCookie, sessionId, secret], user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          formStore: new Keyv(),
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
    fc.user(),
    fc.html(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintId, [connection, sessionCookie, sessionId, secret], user, page) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsUnavailable({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
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
    fc.user(),
    fc.html(),
  ])(
    'when the preprint cannot be found',
    async (preprintId, [connection, sessionCookie, sessionId, secret], user, page) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          formStore: new Keyv(),
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.left(new PreprintIsNotFound({})),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        user,
      })
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.cookieName(), fc.string()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, sessionCookie, secret) => {
      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          getContactEmailAddress: shouldNotBeCalled,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.left('no-session'),
          getUserOnboarding: shouldNotBeCalled,
          formStore: new Keyv(),
          publicUrl: new URL('http://example.com'),
          publishPrereview: shouldNotBeCalled,
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
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
    fc
      .tuple(fc.incompleteForm(), fc.completedForm().map(CompletedFormC.encode))
      .map(parts => merge.withOptions({ mergeArrays: false }, ...parts)),
    fc.user(),
    fc.verifiedContactEmailAddress(),
    fc.html(),
  ])(
    'when the PREreview cannot be published',
    async (
      preprintId,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newReview,
      user,
      contactEmailAddress,
      page,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))
      const templatePage = jest.fn<TemplatePageEnv['templatePage']>(_ => page)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          formStore,
          publicUrl: new URL('http://example.com'),
          publishPrereview: () => TE.left('unavailable'),
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
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: page.toString() },
        ]),
      )
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toStrictEqual(FormC.encode(newReview))
      expect(templatePage).toHaveBeenCalledWith({
        title: expect.anything(),
        content: expect.anything(),
        skipLinks: [[expect.anything(), '#main-content']],
        type: 'streamline',
        user,
      })
    },
  )
})
