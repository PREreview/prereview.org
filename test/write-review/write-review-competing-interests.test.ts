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

describe('writeReviewCompetingInterests', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(
        fc.oneof(
          fc.constant({
            competingInterests: 'no',
          }),
          fc.record({
            competingInterests: fc.constant('yes'),
            competingInterestsDetails: fc.lorem(),
          }),
        ),
        fc.uuid(),
        fc.string(),
      )
      .chain(([competingInterests, sessionId, secret]) =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc.record({
      alreadyWritten: fc.constantFrom('yes', 'no'),
      competingInterests: fc.constantFrom('yes', 'no'),
      competingInterestsDetails: fc.lorem(),
      conduct: fc.constant('yes'),
      moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
      persona: fc.constantFrom('public', 'pseudonym'),
      review: fc.lorem(),
    }),
  ])(
    'when the form is completed',
    async (preprintDoi, preprintTitle, [competingInterests, connection, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject(competingInterests)
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/check-your-prereview`,
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
      .tuple(
        fc.oneof(
          fc.constant({
            competingInterests: 'no',
          }),
          fc.record({
            competingInterests: fc.constant('yes'),
            competingInterestsDetails: fc.lorem(),
          }),
        ),
        fc.uuid(),
        fc.string(),
      )
      .chain(([competingInterests, sessionId, secret]) =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc.oneof(
      fc
        .record(
          {
            alreadyWritten: fc.constantFrom('yes', 'no'),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { withDeletedKeys: true },
        )
        .filter(newReview => Object.keys(newReview).length < 5),
      fc.constant({}),
    ),
  ])(
    'when the form is incomplete',
    async (preprintDoi, preprintTitle, [competingInterests, connection, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject(competingInterests)
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: expect.stringContaining(
              `/preprints/doi-${encodeURIComponent(
                preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}/write-a-prereview/`,
            ),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          body: fc.oneof(
            fc.constant({
              competingInterests: 'no',
            }),
            fc.record({
              competingInterests: fc.constant('yes'),
              competingInterestsDetails: fc.lorem(),
            }),
          ),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
  ])('when there is no form', async (preprintDoi, preprintTitle, [connection, sessionId, secret], user) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, UserC.encode(user))
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          body: fc.record({
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
          }),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
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
  ])('when the preprint cannot be loaded', async (preprintDoi, [connection, sessionId, secret], user, newReview) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, UserC.encode(user))
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
          body: fc.record({
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
          }),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
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
  ])('when the preprint cannot be found', async (preprintDoi, [connection, sessionId, secret], user, newReview) => {
    const sessionStore = new Keyv()
    await sessionStore.set(sessionId, UserC.encode(user))
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
    fc.connection({
      body: fc.record({
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
      }),
      method: fc.constant('POST'),
    }),
    fc.string(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, secret) => {
    const sessionStore = new Keyv()
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
          body: fc.oneof(
            fc.record({ competingInterests: fc.string() }, { withDeletedKeys: true }),
            fc.record(
              { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
              { withDeletedKeys: true },
            ),
          ),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
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
    'without declaring any competing interests',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
