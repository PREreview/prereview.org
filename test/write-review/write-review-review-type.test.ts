import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
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
        .reviewType()
        .chain(reviewType =>
          fc.tuple(
            fc.constant(reviewType),
            fc.connection({ body: fc.constant({ reviewType }), method: fc.constant('POST') }),
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
      const actual = await runMiddleware(
        _.writeReviewReviewType(preprintId)({
          canRapidReview: () => true,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
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
    })

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .reviewType()
        .chain(reviewType =>
          fc.tuple(
            fc.constant(reviewType),
            fc.connection({ body: fc.constant({ reviewType }), method: fc.constant('POST') }),
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
      fc.connection({ body: fc.record({ reviewType: fc.reviewType() }), method: fc.constant('POST') }),
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

    test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
      'when the preprint cannot be loaded',
      async (preprintId, connection, user) => {
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
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
      'when the preprint cannot be found',
      async (preprintId, connection, user) => {
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
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc.connection({
        body: fc.record({ reviewType: fc.lorem() }, { withDeletedKeys: true }),
        method: fc.constant('POST'),
      }),
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
    fc.connection(),
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
