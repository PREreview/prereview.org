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
import { writeReviewMatch, writeReviewReviewMatch } from '../../src/routes'
import { formKey } from '../../src/write-review/form'
import * as _ from '../../src/write-review/index'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAlreadyWritten', () => {
  test.prop([
    fc.indeterminatePreprintId(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
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
  ])('when the form is completed', async (preprintId, preprintTitle, [alreadyWritten, connection], user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
    const getPreprintTitle: Mock<GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintId)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ alreadyWritten })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
    expect(getPreprintTitle).toHaveBeenCalledWith(preprintId)
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
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
      },
      { withDeletedKeys: true },
    ),
  ])(
    'when the form is incomplete',
    async (preprintId, preprintTitle, [alreadyWritten, connection], user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintId)({
          formStore,
          getPreprintTitle,
          getUser: () => M.of(user),
        }),
        connection,
      )()

      expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ alreadyWritten })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
          },
          { type: 'endResponse' },
        ]),
      )
    },
  )

  test.prop([
    fc.indeterminatePreprintId(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('yes', 'no'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([alreadyWritten, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(alreadyWritten),
          fc.connection({
            body: fc.constant({ alreadyWritten }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
      ),
    fc.user(),
  ])('when there is no form', async (preprintId, preprintTitle, [alreadyWritten, connection], user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintId)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(formKey(user.orcid, preprintTitle.id))).toMatchObject({ alreadyWritten })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: format(writeReviewReviewMatch.formatter, { id: preprintTitle.id }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.indeterminatePreprintId(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when the preprint cannot be loaded', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('unavailable' as const)
    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintId)({
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
        body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when the preprint cannot be found', async (preprintId, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.left('not-found' as const)
    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintId)({
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
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.connection({ body: fc.record({ alreadyWritten: fc.constantFrom('yes', 'no') }), method: fc.constant('POST') }),
  ])("when there isn't a session", async (preprintId, preprintTitle, connection) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewAlreadyWritten(preprintId)({
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
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ alreadyWritten: fc.lorem() }, { withDeletedKeys: true }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
    fc.record(
      {
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'yes-private', 'no'),
        persona: fc.constantFrom('public', 'pseudonym'),
      },
      { withDeletedKeys: true },
    ),
  ])(
    'without saying if you have already written the PREreview',
    async (preprintId, preprintTitle, connection, user, newReview) => {
      const formStore = new Keyv()
      await formStore.set(formKey(user.orcid, preprintTitle.id), newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewAlreadyWritten(preprintId)({
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
