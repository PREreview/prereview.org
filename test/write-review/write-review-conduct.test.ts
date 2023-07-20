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
import * as _ from '../../src/write-review'
import { formKey } from '../../src/write-review/form'
import { runMiddleware } from '../middleware'
import { shouldNotBeCalled } from '../should-not-be-called'
import * as fc from './fc'

describe('writeReviewConduct', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.constant({ conduct: 'yes' }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
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
          'competingInterests',
          'competingInterestsDetails',
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
    const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
        canRapidReview: () => canRapidReview,
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ conduct: 'yes' })
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
        body: fc.constant({ conduct: 'yes' }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
    fc.boolean(),
    fc.oneof(
      fc
        .record(
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
        )
        .filter(newReview => Object.keys(newReview).length < 5),
      fc.constant({}),
    ),
  ])('when the form is incomplete', async (preprintId, preprintTitle, connection, user, canRapidReview, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
        canRapidReview: () => canRapidReview,
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ conduct: 'yes' })
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
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.constant({ conduct: 'yes' }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when there is no form', async (preprintId, preprintTitle, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.constant({ conduct: 'yes' }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.constant({ conduct: 'yes' }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when the preprint cannot be found', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.connection({ body: fc.constant({ conduct: 'yes' }), method: fc.constant('POST') }),
  ])("when there isn't a session", async (preprintId, preprintTitle, connection) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
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
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.preprintTitle(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ conduct: fc.string() }, { withDeletedKeys: true }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
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
  ])('without agreement to the Code of Conduct', async (preprintId, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewConduct(preprintId)({
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
