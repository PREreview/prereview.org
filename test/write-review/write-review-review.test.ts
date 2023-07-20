import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewAlreadyWrittenMatch, writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewReview', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .html()
      .map(String)
      .chain(review =>
        fc.tuple(fc.constant(review), fc.connection({ body: fc.constant({ review }), method: fc.constant('POST') })),
      ),
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.alreadyWritten(),
        competingInterests: fc.competingInterests(),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.conduct(),
        introductionMatches: fc.introductionMatches(),
        methodsAppropriate: fc.methodsAppropriate(),
        resultsSupported: fc.resultsSupported(),
        moreAuthors: fc.moreAuthors(),
        persona: fc.persona(),
        review: fc.nonEmptyString(),
        reviewType: fc.reviewType(),
      },
      {
        requiredKeys: [
          'alreadyWritten',
          'competingInterests',
          'competingInterestsDetails',
          'conduct',
          'introductionMatches',
          'methodsAppropriate',
          'resultsSupported',
          'moreAuthors',
          'persona',
          'reviewType',
        ],
      },
    ),
  ])(
    'when the form is completed',
    async (preprintId, preprintTitle, [review, connection], user, canRapidReview, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle: () => TE.right(preprintTitle),
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
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
      .html()
      .map(String)
      .chain(review =>
        fc.tuple(fc.constant(review), fc.connection({ body: fc.constant({ review }), method: fc.constant('POST') })),
      ),
    fc.user(),
    fc.boolean(),
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
      { requiredKeys: ['alreadyWritten'] },
    ),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [review, connection], user, canRapidReview, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ review })
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
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: shouldNotBeCalled,
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
    },
  )

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.left('unavailable' as const)
      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: shouldNotBeCalled,
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
        _.writeReviewReview(preprintId)({
          canRapidReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection) => {
      const formStore = new Keyv()
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: shouldNotBeCalled,
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
    fc.connection({
      body: fc.record({ review: fc.constant('') }, { withDeletedKeys: true }),
      method: fc.constant('POST'),
    }),
    fc.user(),
    fc.boolean(),
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
      { requiredKeys: ['alreadyWritten'] },
    ),
  ])('without a review', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewReview(preprintId)({
        canRapidReview: () => canRapidReview,
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

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection(),
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        competingInterests: fc.competingInterests(),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.conduct(),
        moreAuthors: fc.moreAuthors(),
        persona: fc.persona(),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'without saying if you have already written the PREreview',
    async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewReview(preprintId)({
          canRapidReview: () => canRapidReview,
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
            value: format(writeReviewAlreadyWrittenMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )
})
