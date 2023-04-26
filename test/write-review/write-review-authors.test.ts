import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAuthors', () => {
  describe('when there are more authors', () => {
    test.prop([
      fc.preprintDoi(),
      fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.constant({ moreAuthors: 'yes', moreAuthorsApproved: 'yes' }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          moreAuthorsApproved: fc.constant('yes'),
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
    ])('when they have read and agreed', async (preprintDoi, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({
        moreAuthors: 'yes',
        moreAuthorsApproved: 'yes',
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/add-more-authors`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
    })

    test.prop([
      fc.preprintDoi(),
      fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record(
            { moreAuthors: fc.constant('yes'), moreAuthorsApproved: fc.string() },
            { requiredKeys: ['moreAuthors'] },
          ),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          moreAuthorsApproved: fc.constant('yes'),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { withDeletedKeys: true },
      ),
    ])("when they haven't read and agreed", async (preprintDoi, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
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
    })

    describe("when they don't want to be listed", () => {
      test.prop([
        fc.preprintDoi(),
        fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
          fc.connection({
            body: fc.record(
              { moreAuthors: fc.constantFrom('yes-private'), moreAuthorsApproved: fc.constant('yes') },
              { requiredKeys: ['moreAuthors'] },
            ),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
        fc.user(),
        fc.record(
          {
            alreadyWritten: fc.constantFrom('yes', 'no'),
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
            moreAuthorsApproved: fc.constant('yes'),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { requiredKeys: ['competingInterests', 'competingInterestsDetails', 'conduct', 'persona', 'review'] },
        ),
      ])('when the form is completed', async (preprintDoi, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
        const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintDoi)({
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({
          moreAuthors: 'yes-private',
        })
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: `/preprints/doi-${encodeURIComponent(
                preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}/write-a-prereview/check-your-prereview`,
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
      })

      test.prop([
        fc.preprintDoi(),
        fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
          fc.connection({
            body: fc.record(
              { moreAuthors: fc.constant('yes-private'), moreAuthorsApproved: fc.constant('yes') },
              { requiredKeys: ['moreAuthors'] },
            ),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
        fc.user(),
        fc.oneof(
          fc
            .record(
              {
                alreadyWritten: fc.constantFrom('yes', 'no'),
                competingInterests: fc.constantFrom('yes', 'no'),
                competingInterestsDetails: fc.lorem(),
                conduct: fc.constant('yes'),
                moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
                moreAuthorsApproved: fc.constant('yes'),
                persona: fc.constantFrom('public', 'pseudonym'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            )
            .filter(newReview => Object.keys(newReview).length < 5),
          fc.constant({}),
        ),
      ])('when the form is incomplete', async (preprintDoi, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintDoi)({
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({
          moreAuthors: 'yes-private',
        })
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: expect.stringContaining(
                `/preprints/doi-${encodeURIComponent(
                  preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                )}/write-a-prereview/`,
              ),
            },
            { type: 'endResponse' },
          ]),
        )
      })
    })
  })

  describe("when there aren't more authors", () => {
    test.prop([
      fc.preprintDoi(),
      fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record(
            { moreAuthors: fc.constantFrom('no'), moreAuthorsApproved: fc.constant('yes') },
            { requiredKeys: ['moreAuthors'] },
          ),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          moreAuthorsApproved: fc.constant('yes'),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['competingInterests', 'competingInterestsDetails', 'conduct', 'persona', 'review'] },
      ),
    ])('when the form is completed', async (preprintDoi, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({ moreAuthors: 'no' })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/check-your-prereview`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
    })

    test.prop([
      fc.preprintDoi(),
      fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record(
            { moreAuthors: fc.constant('no'), moreAuthorsApproved: fc.constant('yes') },
            { requiredKeys: ['moreAuthors'] },
          ),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.oneof(
        fc
          .record(
            {
              alreadyWritten: fc.constantFrom('yes', 'no'),
              competingInterests: fc.constantFrom('yes', 'no'),
              competingInterestsDetails: fc.lorem(),
              conduct: fc.constant('yes'),
              moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
              moreAuthorsApproved: fc.constant('yes'),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          )
          .filter(newReview => Object.keys(newReview).length < 5),
        fc.constant({}),
      ),
    ])('when the form is incomplete', async (preprintDoi, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintDoi)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({ moreAuthors: 'no' })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: expect.stringContaining(
              `/preprints/doi-${encodeURIComponent(
                preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
              )}/write-a-prereview/`,
            ),
          },
          { type: 'endResponse' },
        ]),
      )
    })
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.constant('no'), moreAuthorsApproved: fc.constant('yes') },
          { requiredKeys: ['moreAuthors'] },
        ),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when there is no form', async (preprintDoi, preprintTitle, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
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
            preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
          )}/write-a-prereview`,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'), moreAuthorsApproved: fc.constant('yes') },
          { withDeletedKeys: true },
        ),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        moreAuthorsApproved: fc.constantFrom('yes'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('when the preprint cannot be loaded', async (preprintDoi, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
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
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'), moreAuthorsApproved: fc.constant('yes') },
          { withDeletedKeys: true },
        ),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        moreAuthorsApproved: fc.constantFrom('yes'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('when the preprint cannot be found', async (preprintDoi, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
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
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.connection({
      body: fc.record(
        { moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'), moreAuthorsApproved: fc.constant('yes') },
        { withDeletedKeys: true },
      ),
      method: fc.constant('POST'),
    }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.left('no-session'),
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
            preprintTitle.id.doi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
          )}/write-a-prereview`,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record(
          { moreAuthors: fc.string(), moreAuthorsApproved: fc.constant('yes') },
          { withDeletedKeys: true },
        ),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        moreAuthrosAgreed: fc.constant('yes'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('without a moreAuthors', async (preprintDoi, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
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
  })
})
