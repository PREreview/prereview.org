import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import Keyv from 'keyv'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewAddAuthors', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
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
        moreAuthors: fc.constant('yes'),
        persona: fc.persona(),
        review: fc.nonEmptyString(),
        reviewType: fc.reviewType(),
      },
      {
        requiredKeys: [
          'competingInterests',
          'competingInterestsDetails',
          'conduct',
          'introductionMatches',
          'methodsAppropriate',
          'resultsSupported',
          'moreAuthors',
          'persona',
          'review',
          'reviewType',
        ],
      },
    ),
  ])('when the form is completed', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

    const actual = await runMiddleware(
      _.writeReviewAddAuthors(preprintId)({
        canRapidReview: () => canRapidReview,
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
          value: format(writeReviewPublishMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ method: fc.constant('POST') }),
    fc.user(),
    fc.boolean(),
    fc
      .record(
        {
          alreadyWritten: fc.alreadyWritten(),
          competingInterests: fc.competingInterests(),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.conduct(),
          moreAuthors: fc.constant('yes'),
          persona: fc.persona(),
          review: fc.nonEmptyString(),
          reviewType: fc.reviewType(),
        },
        { requiredKeys: ['moreAuthors'] },
      )
      .filter(newReview => Object.keys(newReview).length < 4),
  ])('when the form is incomplete', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

    const actual = await runMiddleware(
      _.writeReviewAddAuthors(preprintId)({
        canRapidReview: () => canRapidReview,
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
          value: expect.stringContaining(`${format(writeReviewMatch.formatter, { id: preprintTitle.id })}/`),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection(), fc.user()])(
    'when there is no form',
    async (preprintId, preprintTitle, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintId)({
          canRapidReview: shouldNotBeCalled,
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
        moreAuthors: fc.constantFrom('yes-private', 'no'),
        persona: fc.persona(),
        review: fc.nonEmptyString(),
      },
      { requiredKeys: ['moreAuthors'] },
    ),
  ])('when there are no more authors', async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)

    const actual = await runMiddleware(
      _.writeReviewAddAuthors(preprintId)({
        canRapidReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.connection(), fc.user()])(
    'when the preprint cannot be loaded',
    async (preprintId, connection, user) => {
      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintId)({
          canRapidReview: shouldNotBeCalled,
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
        _.writeReviewAddAuthors(preprintId)({
          canRapidReview: shouldNotBeCalled,
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

  test.prop([fc.indeterminatePreprintId(), fc.preprintTitle(), fc.connection()])(
    "when there isn't a session",
    async (preprintId, preprintTitle, connection) => {
      const actual = await runMiddleware(
        _.writeReviewAddAuthors(preprintId)({
          canRapidReview: shouldNotBeCalled,
          formStore: new Keyv(),
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
})
