import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewPost', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.record({
      alreadyWritten: fc.constantFrom('yes', 'no'),
      competingInterests: fc.constantFrom('yes', 'no'),
      competingInterestsDetails: fc.lorem(),
      conduct: fc.constant('yes'),
      moreAuthors: fc.constantFrom('yes', 'no'),
      persona: fc.constantFrom('public', 'pseudonym'),
      review: fc.lorem(),
    }),
    fc.user(),
    fc.doi(),
  ])(
    'when the form is complete',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], newReview, user, reviewDoi) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const postPrereview: Mock<_.PostPrereviewEnv['postPrereview']> = jest.fn(_ => TE.right(reviewDoi))

      const actual = await runMiddleware(
        _.writeReviewPost(preprintDoi)({
          formStore,
          getPreprintTitle,
          postPrereview,
          secret,
          sessionStore,
        }),
        connection,
      )()

      expect(postPrereview).toHaveBeenCalledWith({
        conduct: 'yes',
        persona: newReview.persona,
        preprint: {
          doi: preprintDoi,
          ...preprintTitle,
        },
        review: expect.stringContaining(newReview.review),
        user,
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.OK },
          { type: 'clearCookie', name: 'session', options: expect.anything() },
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
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.oneof(fc.constant('yes'), fc.string()),
          moreAuthors: fc.oneof(fc.constantFrom('yes', 'no'), fc.string()),
          persona: fc.oneof(fc.constantFrom('public', 'pseudonym'), fc.string()),
          review: fc.oneof(fc.lorem(), fc.constant('')),
        },
        { withDeletedKeys: true },
      )
      .filter(newReview => Object.keys(newReview).length < 5),
    fc.user(),
  ])(
    'when the form is incomplete',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], newPrereview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newPrereview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPost(preprintDoi)({
          getPreprintTitle,
          formStore,
          postPrereview: () => TE.left(''),
          secret,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'clearCookie', name: 'session', options: expect.anything() },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.lorem(),
      },
      { withDeletedKeys: true },
    ),
    fc.user(),
  ])('when the preprint cannot be loaded', async (preprintDoi, [connection, sessionId, secret], newReview, user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, UserC.encode(user))
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('unavailable' as const)
    const postPrereview = () => () => Promise.reject('should not be called')

    const actual = await runMiddleware(
      _.writeReviewPost(preprintDoi)({
        formStore,
        getPreprintTitle,
        postPrereview,
        secret,
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
  })

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.lorem(),
      },
      { withDeletedKeys: true },
    ),
    fc.user(),
  ])('when the preprint cannot be found', async (preprintDoi, [connection, sessionId, secret], newReview, user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, UserC.encode(user))
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('not-found' as const)
    const postPrereview = () => () => Promise.reject('should not be called')

    const actual = await runMiddleware(
      _.writeReviewPost(preprintDoi)({
        formStore,
        getPreprintTitle,
        postPrereview,
        secret,
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
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.connection({ method: fc.constant('POST') }),
    fc.string(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, secret) => {
    const sessionStore = new Keyv()
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPost(preprintDoi)({
        getPreprintTitle,
        formStore,
        postPrereview: () => TE.left(''),
        secret,
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
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.oneof(fc.fetchResponse({ status: fc.integer({ min: 400 }) }), fc.error()),
    fc.record({
      alreadyWritten: fc.constantFrom('yes', 'no'),
      competingInterests: fc.constantFrom('yes', 'no'),
      competingInterestsDetails: fc.lorem(),
      conduct: fc.constant('yes'),
      moreAuthors: fc.constantFrom('yes', 'no'),
      persona: fc.constantFrom('public', 'pseudonym'),
      review: fc.lorem(),
    }),
    fc.user(),
  ])(
    'Zenodo is unavailable',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], response, newReview, user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewPost(preprintDoi)({
          getPreprintTitle,
          formStore,
          postPrereview: () => TE.left(response),
          secret,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.ServiceUnavailable },
          { type: 'clearCookie', name: 'session', options: expect.anything() },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})
