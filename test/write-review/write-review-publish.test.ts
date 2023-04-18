import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import { CompletedFormC } from '../../src/write-review/completed-form'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewPublish', () => {
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
    fc.completedForm(),
    fc.user(),
    fc.doi(),
    fc.integer(),
  ])(
    'when the form is complete',
    async (
      preprintDoi,
      preprintTitle,
      [connection, sessionCookie, sessionId, secret],
      newReview,
      user,
      reviewDoi,
      reviewId,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, CompletedFormC.encode(newReview))
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const publishPrereview: Mock<_.PublishPrereviewEnv['publishPrereview']> = jest.fn(_ =>
        TE.right([reviewDoi, reviewId]),
      )

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          publishPrereview,
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()
      const session = await sessionStore.get(sessionId)

      expect(publishPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        persona: newReview.persona,
        preprint: {
          doi: preprintDoi,
          ...preprintTitle,
        },
        review: expect.stringContaining(newReview.review.toString()),
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/prereview-published`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
      expect(session).toStrictEqual({
        user: UserC.encode(user),
        'published-review': { doi: reviewDoi, form: CompletedFormC.encode(newReview), id: reviewId },
      })
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
    fc.oneof(
      fc
        .record(
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
        )
        .filter(newReview => Object.keys(newReview).length < 5),
      fc.constant({}),
    ),
    fc.user(),
  ])(
    'when the form is incomplete',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], newPrereview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newPrereview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          getPreprintTitle,
          getUser: () => M.of(user),
          formStore,
          publishPrereview: () => TE.left(''),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'clearCookie', name: sessionCookie, options: expect.anything() },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
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
    'when there is no form',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          getPreprintTitle,
          getUser: () => M.of(user),
          formStore,
          publishPrereview: () => TE.left(''),
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
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.completedForm(),
    fc.user(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], newReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, CompletedFormC.encode(newReview))
      const getPreprintTitle = () => TE.left('unavailable' as const)
      const publishPrereview = () => () => Promise.reject('should not be called')

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          publishPrereview,
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
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.completedForm(),
    fc.user(),
  ])(
    'when the preprint cannot be found',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], newReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, CompletedFormC.encode(newReview))
      const getPreprintTitle = () => TE.left('not-found' as const)
      const publishPrereview = () => () => Promise.reject('should not be called')

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          publishPrereview,
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
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPublish(preprintDoi)({
        getPreprintTitle,
        getUser: () => M.left('no-session'),
        formStore,
        publishPrereview: () => TE.left(''),
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
    fc.oneof(fc.fetchResponse({ status: fc.integer({ min: 400 }) }), fc.error()),
    fc.completedForm(),
    fc.user(),
  ])(
    'Zenodo is unavailable',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], response, newReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, CompletedFormC.encode(newReview))
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPublish(preprintDoi)({
          getPreprintTitle,
          getUser: () => M.of(user),
          formStore,
          publishPrereview: () => TE.left(response),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'clearCookie', name: sessionCookie, options: expect.anything() },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})
