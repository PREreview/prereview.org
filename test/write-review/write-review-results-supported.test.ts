import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewPublishMatch, writeReviewReviewTypeMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import * as fc from './fc'

describe('writeReviewResultsSupported', () => {
  describe('when reviews can be rapid', () => {
    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .resultsSupported()
        .chain(resultsSupported =>
          fc.tuple(
            fc.constant(resultsSupported),
            fc.connection({ body: fc.constant({ resultsSupported }), method: fc.constant('POST') }),
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
          resultsSupported: fc.resultsSupported(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
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
      async (preprintId, preprintTitle, [resultsSupported, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ resultsSupported })
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
      },
    )

    test.prop([
      fc.indeterminatePreprintId(),
      fc.preprintTitle(),
      fc
        .resultsSupported()
        .chain(resultsSupported =>
          fc.tuple(
            fc.constant(resultsSupported),
            fc.connection({ body: fc.constant({ resultsSupported }), method: fc.constant('POST') }),
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
          resultsSupported: fc.resultsSupported(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
          review: fc.nonEmptyString(),
          reviewType: fc.constant('questions'),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
    ])(
      'when the form is incomplete',
      async (preprintId, preprintTitle, [resultsSupported, connection], user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
            getUser: () => M.of(user),
          }),
          connection,
        )()

        expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ resultsSupported })
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

    test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
      'when there is no form',
      async (preprintId, preprintTitle, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.right(preprintTitle),
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
      },
    )

    test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
      'when the preprint cannot be loaded',
      async (preprintId, connection, user) => {
        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left('unavailable'),
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
        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore: new Keyv(),
            getPreprintTitle: () => TE.left('not-found'),
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
        body: fc.record({ resultsSupported: fc.lorem() }, { withDeletedKeys: true }),
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
          reviewType: fc.constant('questions'),
        },
        { requiredKeys: ['alreadyWritten', 'reviewType'] },
      ),
    ])(
      'without saying if the results are supported by the data',
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
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
      fc.connection(),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('no'),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
          reviewType: fc.constant('freeform'),
        },
        { requiredKeys: ['alreadyWritten'] },
      ),
    ])(
      "when you haven't said you want to answer questions",
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
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
      fc.connection(),
      fc.user(),
      fc.record(
        {
          alreadyWritten: fc.constant('yes'),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          moreAuthors: fc.moreAuthors(),
          persona: fc.persona(),
          reviewType: fc.reviewType(),
        },
        { withDeletedKeys: true },
      ),
    ])(
      "when you haven't said you haven't already written your PREreview",
      async (preprintId, preprintTitle, connection, user, newReview) => {
        const formStore = new Keyv()
        await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

        const actual = await runMiddleware(
          _.writeReviewResultsSupported(preprintId)({
            canRapidReview: () => true,
            formStore,
            getPreprintTitle: () => TE.right(preprintTitle),
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

      const actual = await runMiddleware(
        _.writeReviewResultsSupported(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
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
        reviewType: fc.reviewType(),
      },
      { withDeletedKeys: true },
    ),
  ])("when reviews can't be rapid", async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

    const actual = await runMiddleware(
      _.writeReviewResultsSupported(preprintId)({
        canRapidReview: () => false,
        formStore,
        getPreprintTitle: () => TE.right(preprintTitle),
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
