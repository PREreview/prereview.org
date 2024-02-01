import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/Middleware'
import Keyv from 'keyv'
import merge from 'ts-deepmerge'
import { writeReviewEnterEmailAddressMatch, writeReviewMatch, writeReviewPublishedMatch } from '../../src/routes'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import { CompletedFormC } from '../../src/write-review/completed-form'
import { FormC, formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

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
        review: expect.stringContaining('<dl>'),
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
    fc.either(fc.constant('not-found' as const), fc.contactEmailAddress()),
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
  ])('when the preprint cannot be loaded', async (preprintId, [connection, sessionCookie, sessionId, secret], user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, { user: UserC.encode(user) })

    const actual = await runMiddleware(
      _.writeReviewPublish(preprintId)({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left('unavailable'),
        getUser: () => M.of(user),
        getUserOnboarding: shouldNotBeCalled,
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
        { type: 'setStatus', status: Status.ServiceUnavailable },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

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
  ])('when the preprint cannot be found', async (preprintId, [connection, sessionCookie, sessionId, secret], user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, { user: UserC.encode(user) })

    const actual = await runMiddleware(
      _.writeReviewPublish(preprintId)({
        formStore: new Keyv(),
        getContactEmailAddress: shouldNotBeCalled,
        getPreprintTitle: () => TE.left('not-found'),
        getUser: () => M.of(user),
        getUserOnboarding: shouldNotBeCalled,
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
        { type: 'setStatus', status: Status.NotFound },
        { type: 'setHeader', name: 'Cache-Control', value: 'no-store, must-revalidate' },
        { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
        { type: 'setBody', body: expect.anything() },
      ]),
    )
  })

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
  ])(
    'when the PREreview cannot be published',
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
      await formStore.set(formKey(user.orcid, preprintTitle.id), FormC.encode(newReview))

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintId)({
          getContactEmailAddress: () => TE.right(contactEmailAddress),
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
          getUserOnboarding: shouldNotBeCalled,
          formStore,
          publishPrereview: () => TE.left('unavailable'),
          secret,
          sessionCookie,
          sessionStore,
          templatePage: shouldNotBeCalled,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toStrictEqual(FormC.encode(newReview))
    },
  )
})
