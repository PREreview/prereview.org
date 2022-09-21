import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAuthors', () => {
  test('when there are more authors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.constant({ moreAuthors: 'yes' }),
              headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
              method: fc.constant('POST'),
            }),
            fc.constant(sessionId),
            fc.constant(secret),
          ),
        ),
        fc.user(),
        fc.record({
          competingInterests: fc.constantFrom('yes', 'no'),
          competingInterestsDetails: fc.lorem(),
          conduct: fc.constant('yes'),
          moreAuthors: fc.constantFrom('yes', 'no'),
          persona: fc.constantFrom('public', 'pseudonym'),
          review: fc.nonEmptyString(),
        }),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
            connection,
          )()

          expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ moreAuthors: 'yes' })
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
          expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
        },
      ),
    )
  })

  describe("when there aren't more authors", () => {
    test('when the form is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.preprintDoi(),
          fc.record({ title: fc.html(), language: fc.languageCode() }),
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.constant({ moreAuthors: 'no' }),
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
            { requiredKeys: ['competingInterests', 'competingInterestsDetails', 'conduct', 'persona', 'review'] },
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
              _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ moreAuthors: 'no' })
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
                body: fc.constant({ moreAuthors: 'no' }),
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
              _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ moreAuthors: 'no' })
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
  })

  test('when the preprint cannot be loaded', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.anything(),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.record({ moreAuthors: fc.constantFrom('yes', 'no') }),
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
            _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
        fc.connection({
          body: fc.record({ moreAuthors: fc.constantFrom('yes', 'no') }),
          method: fc.constant('POST'),
        }),
        fc.string(),
        async (preprintDoi, preprintTitle, connection, secret) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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

  test('without a moreAuthors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.record({ moreAuthors: fc.string() }, { withDeletedKeys: true }),
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
            _.writeReviewAuthors(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
