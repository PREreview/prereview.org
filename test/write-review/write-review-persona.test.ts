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
import { writeReviewMatch, writeReviewPublishMatch } from '../../src/routes'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewPersona', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('public', 'pseudonym'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([persona, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(persona),
          fc.connection({
            body: fc.constant({ persona }),
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
        requiredKeys: ['competingInterests', 'competingInterestsDetails', 'conduct', 'moreAuthors', 'review'],
      },
    ),
  ])('when the form is completed', async (preprintDoi, preprintTitle, [persona, connection], user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
    const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({ persona })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: format(writeReviewPublishMatch.formatter, { doi: preprintTitle.id.doi }),
        },
        { type: 'endResponse' },
      ]),
    )
    expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.constantFrom('public', 'pseudonym'), fc.cookieName(), fc.uuid(), fc.string())
      .chain(([persona, sessionCookie, sessionId, secret]) =>
        fc.tuple(
          fc.constant(persona),
          fc.connection({
            body: fc.constant({ persona }),
            headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
        ),
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
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { withDeletedKeys: true },
        )
        .filter(newReview => Object.keys(newReview).length < 5),
      fc.constant({}),
    ),
  ])('when the form is incomplete', async (preprintDoi, preprintTitle, [persona, connection], user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
        formStore,
        getPreprintTitle,
        getUser: () => M.of(user),
      }),
      connection,
    )()

    expect(await formStore.get(`${user.orcid}_${preprintTitle.id.doi}`)).toMatchObject({ persona })
    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: expect.stringContaining(`${format(writeReviewMatch.formatter, { doi: preprintTitle.id.doi })}/`),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ persona: fc.constantFrom('public', 'pseudonym') }),
        headers: fc.constant({ Cookie: `${sessionCookie}=${cookieSignature.sign(sessionId, secret)}` }),
        method: fc.constant('POST'),
      }),
    ),
    fc.user(),
  ])('when there is no form', async (preprintDoi, preprintTitle, connection, user) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
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
          value: format(writeReviewMatch.formatter, { doi: preprintTitle.id.doi }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ persona: fc.constantFrom('public', 'pseudonym') }),
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
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('when the preprint cannot be loaded', async (preprintDoi, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('unavailable' as const)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
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
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ persona: fc.constantFrom('public', 'pseudonym') }),
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
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('when the preprint cannot be found', async (preprintDoi, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
    const getPreprintTitle = () => TE.left('not-found' as const)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
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
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.connection({ body: fc.constant({ conduct: 'yes' }), method: fc.constant('POST') }),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection) => {
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
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
          value: format(writeReviewMatch.formatter, { doi: preprintTitle.id.doi }),
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ id: fc.preprintId(), title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.cookieName(), fc.string()).chain(([sessionId, sessionCookie, secret]) =>
      fc.connection({
        body: fc.record({ persona: fc.string() }, { withDeletedKeys: true }),
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
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
  ])('without a persona', async (preprintDoi, preprintTitle, connection, user, newReview) => {
    const formStore = new Keyv()
    await formStore.set(`${user.orcid}_${preprintTitle.id.doi}`, newReview)
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewPersona(preprintDoi)({
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
