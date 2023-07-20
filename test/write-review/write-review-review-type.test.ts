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
import type { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import { formKey } from '../../src/write-review/form'
import * as _ from '../../src/write-review/index'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewReviewType', () => {
  describe('when reviews can be rapid', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .tuple(fc.constantFrom('questions', 'freeform'), fc.cookieName(), fc.uuid(), fc.string())
        .chain(([reviewType, sessionCookie, sessionId, secret]) =>
          fc.tuple(
            fc.constant(reviewType),
            fc.connection({
              body: fc.constant({ reviewType }),
              headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
              method: fc.constant('POST'),
            }),
          ),
        ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('no'),
          reviewType: fc.reviewType(),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          introductionMatches: fc.introductionMatches(),
          methodsAppropriate: fc.methodsAppropriate(),
          resultsSupported: fc.resultsSupported(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
          review: fc.nonEmptyString(),
        },
        {
          requiredKeys: [
            'competingInterests',
            'competingInterestsDetails',
            'conduct',
            'introductionMatches',
            'methodsAppropriate',
            'moreAuthors',
            'resultsSupported',
            'persona',
            'review',
          ],
        },
      ),
    ])('when the form is completed', async (preprintId, preprintTitle, [reviewType, connection], user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ reviewType })
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
      fc
        .tuple(fc.constantFrom('questions', 'freeform'), fc.cookieName(), fc.uuid(), fc.string())
        .chain(([reviewType, sessionCookie, sessionId, secret]) =>
          fc.tuple(
            fc.constant(reviewType),
            fc.connection({
              body: fc.constant({ reviewType }),
              headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
              method: fc.constant('POST'),
            }),
          ),
        ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('no'),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          introductionMatches: fc.introductionMatches(),
          methodsAppropriate: fc.methodsAppropriate(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
          review: fc.nonEmptyString(),
        },
        { withDeletedKeys: true },
      ),
    ])('when the form is incomplete', async (preprintId, preprintTitle, [reviewType, connection], user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ reviewType })
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

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.tuple(fc.cookieName(), fc.uuid(), fc.string()).chain(([sessionCookie, sessionId, secret]) =>
        fc.connection({
          body: fc.record({ reviewType: fc.reviewType() }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when there is no form', async (preprintId, preprintTitle, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
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
            value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
          },
          { type: 'endResponse' },
        ]),
      )
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record({ reviewType: fc.reviewType() }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.left('unavailable' as const)
      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
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
          body: fc.record({ reviewType: fc.reviewType() }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when the preprint cannot be found', async (preprintId, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.left('not-found' as const)
      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
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
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record({ reviewType: fc.lorem() }, { withDeletedKeys: true }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('no'),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
        },
        { withDeletedKeys: true },
      ),
    ])(
      'without saying how you would like to write your PREreview',
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewReviewType(preprintId)({
            canRapidReview: () => true,
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
      },
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.boolean()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection, canRapidReview) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => canRapidReview,
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
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.cookieName(), fc.uuid(), fc.string()).chain(([sessionCookie, sessionId, secret]) =>
      fc.connection({
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
      }),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.alreadyWritten(),
        competingInterests: fc.competingInterests(),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.conduct(),
        moreAuthors: fc.moreAuthors(),
        persona: fc.persona(),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])("when reviews can't be rapid", async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewReviewType(preprintId)({
        canRapidReview: () => false,
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
})
