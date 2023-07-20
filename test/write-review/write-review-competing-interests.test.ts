import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import * as M from 'hyper-ts/lib/Middleware'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import type { GetPreprintTitleEnv } from '../../src/preprint'
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewCompetingInterests', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc
      .oneof(
        fc.constant({ competingInterests: 'no' }),
        fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
      )
      .chain(competingInterests =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            method: fc.constant('POST'),
          }),
        ),
      ),
    fc.user(),
    fc.boolean(),
    fc.record({
      alreadyWritten: fc.alreadyWritten(),
      competingInterests: fc.competingInterests(),
      competingInterestsDetails: fc.lorem(),
      conduct: fc.conduct(),
      introductionMatches: fc.introductionMatches(),
      methodsAppropriate: fc.methodsAppropriate(),
      resultsSupported: fc.resultsSupported(),
      moreAuthors: fc.moreAuthors(),
      persona: fc.persona(),
      review: fc.lorem(),
      reviewType: fc.reviewType(),
    }),
  ])(
    'when the form is completed',
    async (preprintId, preprintTitle, [competingInterests, connection], user, canRapidReview, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
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
      .oneof(
        fc.constant({ competingInterests: 'no' }),
        fc.record({ competingInterests: fc.constant('yes'), competingInterestsDetails: fc.lorem() }),
      )
      .chain(competingInterests =>
        fc.tuple(
          fc.constant(competingInterests),
          fc.connection({
            body: fc.constant(competingInterests),
            method: fc.constant('POST'),
          }),
        ),
      ),
    fc.user(),
    fc.boolean(),
    fc.oneof(
      fc
        .record(
          {
            alreadyWritten: fc.alreadyWritten(),
            conduct: fc.conduct(),
            moreAuthors: fc.moreAuthors(),
            persona: fc.persona(),
            review: fc.nonEmptyString(),
            reviewType: fc.reviewType(),
          },
          { withDeletedKeys: true },
        )
        .filter(newReview => Object.keys(newReview).length < 5),
      fc.constant({}),
    ),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [competingInterests, connection], user, canRapidReview, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewCompetingInterests(preprintId)({
          canRapidReview: () => canRapidReview,
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject(competingInterests)
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
        _.writeReviewCompetingInterests(preprintId)({
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
        _.writeReviewCompetingInterests(preprintId)({
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
        _.writeReviewCompetingInterests(preprintId)({
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
        _.writeReviewCompetingInterests(preprintId)({
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
      body: fc.oneof(
        fc.record({ competingInterests: fc.string() }, { withDeletedKeys: true }),
        fc.record(
          { competingInterests: fc.constant('yes'), competingInterestsDetails: fc.constant('') },
          { withDeletedKeys: true },
        ),
      ),
      method: fc.constant('POST'),
    }),
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
  ])('without declaring any competing interests', async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewCompetingInterests(preprintId)({
        canRapidReview: shouldNotBeCalled,
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
