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
import * as _ from '../../src/write-review/index'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAlreadyWritten', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionCookie),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      {
        requiredKeys: [
          'competingInterests',
          'competingInterestsDetails',
          'conduct',
          'moreAuthors',
          'persona',
          'review',
        ],
      },
    ),
  ])(
    'when the form is completed',
    async (
      preprintDoi,
      preprintTitle,
      [alreadyWritten, connection, sessionCookie, sessionId, secret],
      user,
      newReview,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ alreadyWritten })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/write-your-prereview`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionCookie),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the form is incomplete',
    async (
      preprintDoi,
      preprintTitle,
      [alreadyWritten, connection, sessionCookie, sessionId, secret],
      user,
      newReview,
    ) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ alreadyWritten })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/write-your-prereview`,
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
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
    async (preprintDoi, preprintTitle, [alreadyWritten, connection, sessionCookie, sessionId, secret], user) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ alreadyWritten })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/write-your-prereview`,
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
          body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the preprint cannot be loaded',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('unavailable' as const)
      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
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
          body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the preprint cannot be found',
    async (preprintDoi, [connection, sessionCookie, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('not-found' as const)
      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
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
    fc.connection({ body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }), method: fc.constant('POST') }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, sessionCookie, secret) => {
    const sessionStore = new Keyv()
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.left('no-session'),
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
          body: fc.record({ alreadyWritten: fc.lorem() }, { withDeletedKeys: true }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionCookie),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.record(
      {
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'without saying if you have already written the PREreview',
    async (preprintDoi, preprintTitle, [connection, sessionCookie, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, { user: UserC.encode(user) })
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
          secret,
          sessionCookie,
          sessionStore,
        }),
        connection,
      )()

      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.BadRequest },
          { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
          { type: 'setBody', body: expect.anything() },
        ]),
      )
    },
  )
})
