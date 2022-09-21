import cookieSignature from 'cookie-signature'
import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('index', () => {
  describe('writeReviewConduct', () => {
    test('when the form is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.constant({ conduct: 'yes' }),
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
              competingInterests: fc.constantFrom('yes', 'no'),
              competingInterestsDetails: fc.lorem(),
              conduct: fc.constant('yes'),
              moreAuthors: fc.constantFrom('yes', 'no'),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['competingInterests', 'competingInterestsDetails', 'moreAuthors', 'persona', 'review'] },
          ),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
              TE.right(preprintTitle),
            )

            const actual = await runMiddleware(
              _.writeReviewConduct(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ conduct: 'yes' })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: `/preprints/doi-${encodeURIComponent(
                    preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                  )}/write-a-prereview/check-your-prereview`,
                },
                { type: 'endResponse' },
              ]),
            )
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.constant({ conduct: 'yes' }),
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
                competingInterests: fc.constantFrom('yes', 'no'),
                competingInterestsDetails: fc.lorem(),
                conduct: fc.constant('yes'),
                moreAuthors: fc.constantFrom('yes', 'no'),
                persona: fc.constantFrom('public', 'pseudonym'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            )
            .filter(newReview => Object.keys(newReview).length < 5),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewConduct(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ conduct: 'yes' })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: expect.stringContaining(
                    `/preprints/doi-${encodeURIComponent(
                      preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                    )}/write-a-prereview/`,
                  ),
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.anything(),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.constant({ conduct: 'yes' }),
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
              competingInterests: fc.constantFrom('yes', 'no'),
              competingInterestsDetails: fc.lorem(),
              conduct: fc.constant('yes'),
              moreAuthors: fc.constantFrom('yes', 'no'),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          ),
          async (preprintDoi, error, [connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle = () => TE.left(error)

            const actual = await runMiddleware(
              _.writeReviewConduct(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
        ),
      )
    })

    test("when there isn't a session", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.connection({ body: fc.constant({ conduct: 'yes' }), method: fc.constant('POST') }),
          fc.string(),
          async (preprintDoi, preprintTitle, connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewConduct(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
          },
        ),
      )
    })

    test('without agreement to the Code of Conduct', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.record({ conduct: fc.string() }, { withDeletedKeys: true }),
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
              competingInterests: fc.constantFrom('yes', 'no'),
              competingInterestsDetails: fc.lorem(),
              conduct: fc.constant('yes'),
              moreAuthors: fc.constantFrom('yes', 'no'),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          ),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewConduct(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
        ),
      )
    })
  })

  describe('writeReviewPost', () => {
    test('when the form is complete', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc.record({
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.lorem(),
          }),
          fc.user(),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
              TE.right(preprintTitle),
            )
            const createRecord: jest.MockedFunction<_.CreateRecordEnv['createRecord']> = jest.fn(_ =>
              TE.right({
                id: 1,
                metadata: {
                  creators: [user],
                  description: 'Description',
                  doi: '10.5072/zenodo.1055806' as Doi,
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'article',
                },
                state: 'done',
                submitted: true,
              }),
            )

            const actual = await runMiddleware(
              _.writeReviewPost(preprintDoi)({ createRecord, formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(createRecord).toHaveBeenCalledWith({
              conduct: 'yes',
              persona: newReview.persona,
              preprint: {
                doi: preprintDoi,
                ...preprintTitle,
              },
              review: expect.stringContaining(newReview.review),
              user,
            })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.OK },
                { type: 'clearCookie', name: 'session', options: expect.anything() },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
            expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc
            .record(
              {
                competingInterests: fc.constantFrom('yes', 'no'),
                competingInterestsDetails: fc.lorem(),
                conduct: fc.oneof(fc.constant('yes'), fc.string()),
                moreAuthors: fc.oneof(fc.constantFrom('yes', 'no'), fc.string()),
                persona: fc.oneof(fc.constantFrom('public', 'pseudonym'), fc.string()),
                review: fc.oneof(fc.lorem(), fc.constant('')),
              },
              { withDeletedKeys: true },
            )
            .filter(newReview => Object.keys(newReview).length < 5),
          fc.user(),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], newPrereview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newPrereview)
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewPost(preprintDoi)({
                createRecord: () => TE.left(''),
                getPreprintTitle,
                formStore,
                secret,
                sessionStore,
              }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.ServiceUnavailable },
                { type: 'clearCookie', name: 'session', options: expect.anything() },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.anything(),
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
          fc.record(
            {
              competingInterests: fc.constantFrom('yes', 'no'),
              competingInterestsDetails: fc.lorem(),
              conduct: fc.constant('yes'),
              moreAuthors: fc.constantFrom('yes', 'no'),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.lorem(),
            },
            { withDeletedKeys: true },
          ),
          fc.user(),
          async (preprintDoi, error, [connection, sessionId, secret], newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle = () => TE.left(error)
            const createRecord = () => () => Promise.reject('should not be called')

            const actual = await runMiddleware(
              _.writeReviewPost(preprintDoi)({ createRecord, formStore, getPreprintTitle, secret, sessionStore }),
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
        ),
      )
    })

    test("when there isn't a session", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.connection({ method: fc.constant('POST') }),
          fc.string(),
          async (preprintDoi, preprintTitle, connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewPost(preprintDoi)({
                createRecord: () => TE.left(''),
                getPreprintTitle,
                formStore,
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
          },
        ),
      )
    })

    test('Zenodo is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc.oneof(fc.fetchResponse({ status: fc.integer({ min: 400 }) }), fc.error()),
          fc.record({
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.lorem(),
          }),
          fc.user(),
          async (preprintDoi, preprintTitle, [connection, sessionId, secret], response, newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReviewPost(preprintDoi)({
                createRecord: () => TE.left(response),
                getPreprintTitle,
                formStore,
                secret,
                sessionStore,
              }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.ServiceUnavailable },
                { type: 'clearCookie', name: 'session', options: expect.anything() },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })
  })
})
