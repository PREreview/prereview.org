import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewAddAuthorsMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAuthors', () => {
  describe('when there are more authors', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
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
    ])('when they have read and agreed', async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
        moreAuthors: 'yes',
        moreAuthorsApproved: 'yes',
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewAddAuthorsMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
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
    ])("when they haven't read and agreed", async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
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
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
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
      ])('when the form is completed', async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
          moreAuthors: 'yes-private',
        })
        expect(actual).toStrictEqual(
          E.right([
            { type: 'setStatus', status: Status.SeeOther },
            {
              type: 'setHeader',
              name: 'Location',
              value: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
            },
            { type: 'endResponse' },
          ]),
        )
        expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
      })

      test.prop([
        fc.indeterminatePreprintId(),
        fc.preprintTitle(),
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
      ])('when the form is incomplete', async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewAuthors(preprintId)({
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({
          moreAuthors: 'yes-private',
        })
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
      })
    })
  })

  describe("when there aren't more authors", () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
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
    ])('when the form is completed', async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
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
    ])('when the form is incomplete', async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAuthors(preprintId)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ moreAuthors: 'no' })
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
    })
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
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
  ])('when there is no form', async (preprintId, preprintTitle, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintId)({
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
          value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
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
  ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintId)({
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
    fc.indeterminatePreprintId(),
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
  ])('when the preprint cannot be found', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintId)({
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
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({
      body: fc.record(
        { moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'), moreAuthorsApproved: fc.constant('yes') },
        { withDeletedKeys: true },
      ),
      method: fc.constant('POST'),
    }),
    fc.cookieName(),
    fc.string(),
  ])("when there isn't a session", async (preprintId, preprintTitle, connection) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintId)({
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
          value: format(writeReviewMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
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
  ])('without a moreAuthors', async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAuthors(preprintId)({
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
