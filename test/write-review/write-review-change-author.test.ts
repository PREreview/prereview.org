import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import type { Mock } from 'jest-mock'
import Keyv from 'keyv'
import { CanAddAuthorsEnv } from '../../src/feature-flags'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewChangeAuthor', () => {
  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(
        fc.record({ name: fc.nonEmptyString(), orcid: fc.option(fc.orcid(), { nil: undefined }) }),
        fc.uuid(),
        fc.string(),
      )
      .chain(([otherAuthor, sessionId, secret]) =>
        fc.tuple(
          fc.constant(otherAuthor),
          fc.connection({
            body: fc.constant({ name: otherAuthor.name, orcid: otherAuthor.orcid ?? '' }),
            headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
            method: fc.constant('POST'),
          }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.nonEmptyArray(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors', 'otherAuthors'] },
      )
      .chain(newReview =>
        fc.tuple(fc.constant(newReview), fc.integer({ min: 0, max: newReview.otherAuthors.length - 1 })),
      ),
  ])(
    'when the form is completed',
    async (preprintDoi, preprintTitle, [author, connection, sessionId, secret], user, [newReview, authorIndex]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const canAddAuthors: Mock<CanAddAuthorsEnv['canAddAuthors']> = jest.fn(_ => true)
      const getPreprintTitle: Mock<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ => TE.right(preprintTitle))
      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
        }),
        connection,
      )()

      expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({
        otherAuthors: expect.arrayContaining([author]),
      })
      expect(actual).toStrictEqual(
        E.right([
          { type: 'setStatus', status: Status.SeeOther },
          {
            type: 'setHeader',
            name: 'Location',
            value: `/preprints/doi-${encodeURIComponent(
              preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
            )}/write-a-prereview/add-more-authors`,
          },
          { type: 'endResponse' },
        ]),
      )
      expect(canAddAuthors).toHaveBeenCalledWith(user)
      expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
    },
  )

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.uuid(), fc.string())
      .chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({ headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }) }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('no'),
          otherAuthors: fc.nonEmptyArray(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors', 'otherAuthors'] },
      )
      .chain(newReview =>
        fc.tuple(fc.constant(newReview), fc.integer({ min: 0, max: newReview.otherAuthors.length - 1 })),
      ),
  ])(
    'when there are no more authors',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => true,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc
      .tuple(fc.uuid(), fc.string())
      .chain(([sessionId, secret]) =>
        fc.tuple(
          fc.connection({ headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }) }),
          fc.constant(sessionId),
          fc.constant(secret),
        ),
      ),
    fc.user(),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('no'),
          otherAuthors: fc.array(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors', 'otherAuthors'] },
      )
      .chain(newReview => fc.tuple(fc.constant(newReview), fc.integer({ min: newReview.otherAuthors.length }))),
  ])(
    'when the author is not found',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => true,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        otherAuthors: fc.nonEmptyArray(
          fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
        ),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
    fc.integer(),
  ])(
    'when the preprint cannot be loaded',
    async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview, authorIndex) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('unavailable' as const)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => canAddAuthors,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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

  test.prop([
    fc.preprintDoi(),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.boolean(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
    fc.integer(),
  ])(
    'when the preprint cannot be found',
    async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview, authorIndex) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.left('not-found' as const)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => canAddAuthors,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc.record(
      {
        alreadyWritten: fc.constantFrom('yes', 'no'),
        competingInterests: fc.constantFrom('yes', 'no'),
        competingInterestsDetails: fc.lorem(),
        conduct: fc.constant('yes'),
        moreAuthors: fc.constantFrom('yes', 'no'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] })),
        persona: fc.constantFrom('public', 'pseudonym'),
        review: fc.nonEmptyString(),
      },
      { withDeletedKeys: true },
    ),
    fc.integer(),
  ])(
    "when authors can't be added",
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview, authorIndex) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => false,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.connection({ method: fc.constant('POST') }),
    fc.string(),
    fc.integer(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, secret, authorIndex) => {
    const sessionStore = new Keyv()
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewChangeAuthor(
        preprintDoi,
        authorIndex,
      )({
        canAddAuthors: () => true,
        formStore,
        getPreprintTitle,
        secret,
        sessionStore,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: `/preprints/doi-${encodeURIComponent(
            preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
          )}/write-a-prereview`,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.connection({ method: fc.constant('POST') }),
    fc.string(),
    fc.integer(),
  ])("when there isn't a session", async (preprintDoi, preprintTitle, connection, secret, authorIndex) => {
    const sessionStore = new Keyv()
    const formStore = new Keyv()
    const getPreprintTitle = () => TE.right(preprintTitle)

    const actual = await runMiddleware(
      _.writeReviewChangeAuthor(
        preprintDoi,
        authorIndex,
      )({
        canAddAuthors: () => true,
        formStore,
        getPreprintTitle,
        secret,
        sessionStore,
      }),
      connection,
    )()

    expect(actual).toStrictEqual(
      E.right([
        { type: 'setStatus', status: Status.SeeOther },
        {
          type: 'setHeader',
          name: 'Location',
          value: `/preprints/doi-${encodeURIComponent(
            preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
          )}/write-a-prereview`,
        },
        { type: 'endResponse' },
      ]),
    )
  })

  test.prop([
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          body: fc.constant({}),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.nonEmptyArray(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors', 'otherAuthors'] },
      )
      .chain(newReview =>
        fc.tuple(fc.constant(newReview), fc.integer({ min: 0, max: newReview.otherAuthors.length - 1 })),
      ),
  ])(
    'without a name',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => true,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
    fc.preprintDoi(),
    fc.record({ title: fc.html(), language: fc.languageCode() }),
    fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
      fc.tuple(
        fc.connection({
          body: fc.record({ name: fc.nonEmptyString(), orcid: fc.nonEmptyString() }, { requiredKeys: ['name'] }),
          headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
          method: fc.constant('POST'),
        }),
        fc.constant(sessionId),
        fc.constant(secret),
      ),
    ),
    fc.user(),
    fc
      .record(
        {
          alreadyWritten: fc.constantFrom('yes', 'no'),
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constant('yes'),
          otherAuthors: fc.nonEmptyArray(
            fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
          ),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        },
        { requiredKeys: ['moreAuthors', 'otherAuthors'] },
      )
      .chain(newReview =>
        fc.tuple(fc.constant(newReview), fc.integer({ min: 0, max: newReview.otherAuthors.length - 1 })),
      ),
  ])(
    'without an ORCID iD',
    async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
      const sessionStore = new Keyv()
      await sessionStore.set(sessionId, UserC.encode(user))
      const formStore = new Keyv()
      await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
      const getPreprintTitle = () => TE.right(preprintTitle)

      const actual = await runMiddleware(
        _.writeReviewChangeAuthor(
          preprintDoi,
          authorIndex,
        )({
          canAddAuthors: () => true,
          formStore,
          getPreprintTitle,
          secret,
          sessionStore,
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
