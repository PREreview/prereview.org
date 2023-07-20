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
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewIntroductionMatches', () => {
  describe('when reviews can be rapid', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .tuple(fc.constantFrom('yes', 'partly', 'no', 'skip'), fc.cookieName(), fc.uuid(), fc.string())
        .chain(([introductionMatches, sessionCookie, sessionId, secret]) =>
          fc.tuple(
            fc.constant(introductionMatches),
            fc.connection({
              body: fc.constant({ introductionMatches }),
              headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
              method: fc.constant('POST'),
            }),
          ),
        ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          introductionMatches: fc.constantFrom('yes', 'partly', 'no', 'skip'),
          methodsAppropriate: fc.constantFrom(
            'inappropriate',
            'somewhat-inappropriate',
            'adequate',
            'mostly-appropriate',
            'highly-appropriate',
            'skip',
          ),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
          reviewType: fc.constant('questions'),
        },
        {
          requiredKeys: [
            'alreadyWritten',
            'competingInterests',
            'competingInterestsDetails',
            'conduct',
            'introductionMatches',
            'methodsAppropriate',
            'moreAuthors',
            'persona',
            'review',
            'reviewType',
          ],
        },
      ),
    ])(
      'when the form is completed',
      async (preprintId, preprintTitle, [introductionMatches, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
        const actual = await runMiddleware(
          _.writeReviewIntroductionMatches(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ introductionMatches })
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
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .tuple(fc.constantFrom('yes', 'partly', 'no', 'skip'), fc.cookieName(), fc.uuid(), fc.string())
        .chain(([introductionMatches, sessionCookie, sessionId, secret]) =>
          fc.tuple(
            fc.constant(introductionMatches),
            fc.connection({
              body: fc.constant({ introductionMatches }),
              headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
              method: fc.constant('POST'),
            }),
          ),
        ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constantFrom('no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          introductionMatches: fc.constantFrom('yes', 'partly', 'no', 'skip'),
          methodsAppropriate: fc.constantFrom(
            'inappropriate',
            'somewhat-inappropriate',
            'adequate',
            'mostly-appropriate',
            'highly-appropriate',
            'skip',
          ),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
          reviewType: fc.constant('questions'),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
    ])(
      'when the form is incomplete',
      async (preprintId, preprintTitle, [introductionMatches, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewIntroductionMatches(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle,
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ introductionMatches })
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
      fc.tuple(fc.cookieName(), fc.uuid(), fc.string()).chain(([sessionCookie, sessionId, secret]) =>
        fc.connection({
          body: fc.record({ introductionMatches: fc.constantFrom('yes', 'partly', 'no', 'skip') }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when there is no form', async (preprintId, preprintTitle, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewIntroductionMatches(preprintId)({
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
          body: fc.record({ introductionMatches: fc.constantFrom('yes', 'partly', 'no', 'skip') }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.left('unavailable' as const)
      const actual = await runMiddleware(
        _.writeReviewIntroductionMatches(preprintId)({
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
          body: fc.record({ introductionMatches: fc.constantFrom('yes', 'partly', 'no', 'skip') }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
    ])('when the preprint cannot be found', async (preprintId, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.left('not-found' as const)
      const actual = await runMiddleware(
        _.writeReviewIntroductionMatches(preprintId)({
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
          body: fc.record({ introductionMatches: fc.lorem() }, { withDeletedKeys: true }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          reviewType: fc.constant('questions'),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
    ])(
      'without saying if the introduction matches the rest of the preprint',
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewIntroductionMatches(preprintId)({
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

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
        fc.connection({
          body: fc.record({ introductionMatches: fc.lorem() }, { withDeletedKeys: true }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          reviewType: fc.constant('freeform'),
        },
        { requiredKeys: ['alreadyWritten'] },
      ),
    ])(
      "when you haven't said you want to answer questions",
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewIntroductionMatches(preprintId)({
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
              value: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
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
        fc.connection({
          body: fc.record({ introductionMatches: fc.lorem() }, { withDeletedKeys: true }),
          headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
      ),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('yes'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          reviewType: fc.constantFrom('questions', 'freeform'),
        },
        { withDeletedKeys: true },
      ),
    ])(
      "when you haven't said you haven't already written your PREreview",
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
        const getPreprintTitle = () => TE.right(preprintTitle)

        const actual = await runMiddleware(
          _.writeReviewIntroductionMatches(preprintId)({
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
              value: format(writeReviewReviewTypeMatch.formatter, { id: preprintTitle.id }),
            },
            { type: 'endResponse' },
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
        _.writeReviewIntroductionMatches(preprintId)({
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
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
        reviewType: fc.constantFrom('questions', 'freeform'),
      },
      { withDeletedKeys: true },
    ),
  ])("when reviews can't be rapid", async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewIntroductionMatches(preprintId)({
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
