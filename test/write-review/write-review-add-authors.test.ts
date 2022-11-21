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

describe('writeReviewAddAuthors', () => {
  describe('when authors can be added', () => {
    test.prop([
      fc.preprintDoi(),
      fc.record({ title: fc.html(), language: fc.languageCode() }),
      fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({
            body: fc.constant({ anotherAuthor: 'yes' }),
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
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.array(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors'] },
      ),
    ])(
      'when there are more authors to add',
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => true,
            formStore,
            getPreprintTitle,
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
              )}/write-a-prereview/add-author`,
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
      fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({
            body: fc.constant({ anotherAuthor: 'no' }),
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
        moreAuthors: fc.constant('yes'),
        otherAuthors: fc.nonEmptyArray(
          fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
        ),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      }),
    ])(
      'when the form is complete',
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => true,
            formStore,
            getPreprintTitle,
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
      fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({
            body: fc.constant({ anotherAuthor: 'no' }),
            headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
      fc.user(),
      fc
        .record(
          {
            alreadyWritten: fc.constantFrom('yes', 'no'),
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constant('yes'),
            otherAuthors: fc.array(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { requiredKeys: ['moreAuthors'] },
        )
        .filter(newReview => Object.keys(newReview).length < 5),
    ])(
      'when the form is incomplete',
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => true,
            formStore,
            getPreprintTitle,
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
              value: expect.stringContaining(
                `/preprints/doi-${encodeURIComponent(
                  preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                )}/write-a-prereview`,
              ),
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
      fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({
            headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
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
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.constant([]),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors'] },
      ),
    ])(
      'when there are no other authors yet',
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => true,
            formStore,
            getPreprintTitle,
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
              )}/write-a-prereview/add-author`,
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
      },
    )
  })

  describe('when authors cannot be added', () => {
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
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.array(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
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
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => false,
            formStore,
            getPreprintTitle,
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
      fc.user(),
      fc
        .record(
          {
            alreadyWritten: fc.constantFrom('yes', 'no'),
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constant('yes'),
            otherAuthors: fc.array(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { requiredKeys: ['moreAuthors'] },
        )
        .filter(newReview => Object.keys(newReview).length < 4),
    ])(
      'when the form is incomplete',
      async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
        const sessionStore = new Keyv()
        await sessionStore.set(sessionId, UserC.encode(user))
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAddAuthors(preprintDoi)({
            canAddAuthors: () => false,
            formStore,
            getPreprintTitle,
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
              value: expect.stringContaining(
                `/preprints/doi-${encodeURIComponent(
                  preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                )}/write-a-prereview`,
              ),
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
      },
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
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constant('no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { requiredKeys: ['moreAuthors'] },
    ),
  ])(
    'when there are no more authors',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, canAddAuthors, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintDoi)({
          canAddAuthors: () => canAddAuthors,
          formStore,
          getPreprintTitle,
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
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the preprint cannot be loaded',
    async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('unavailable' as const)

      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintDoi)({
          canAddAuthors: () => canAddAuthors,
          formStore,
          getPreprintTitle,
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
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the preprint cannot be found',
    async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('not-found' as const)

      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintDoi)({
          canAddAuthors: () => canAddAuthors,
          formStore,
          getPreprintTitle,
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
    },
  )

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
      _.writeReviewAddAuthors(preprintDoi)({
        canAddAuthors: () => {
          throw 'Should not be called'
        },
        formStore,
        getPreprintTitle,
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
})
