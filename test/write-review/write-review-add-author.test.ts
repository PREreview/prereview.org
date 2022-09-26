import cookieSignature from 'cookie-signature'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { CanAddAuthorsEnv } from '../../src/feature-flags'
import { UserC } from '../../src/user'
import * as _ from '../../src/write-review'
import * as fc from '../fc'
import { runMiddleware } from '../middleware'

describe('writeReviewAddAuthor', () => {
  test('when the form is completed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.nonEmptyString(), fc.uuid(), fc.string()).chain(([name, sessionId, secret]) =>
          fc.tuple(
            fc.constant(name),
            fc.connection({
              body: fc.constant({ name }),
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
            moreAuthors: fc.constant('yes'),
            otherAuthors: fc.array(fc.nonEmptyString()),
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
        async (preprintDoi, preprintTitle, [name, connection, sessionId, secret], user, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const canAddAuthors: jest.MockedFunction<CanAddAuthorsEnv['canAddAuthors']> = jest.fn(_ => true)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewAddAuthor(preprintDoi)({
              canAddAuthors,
              formStore,
              getPreprintTitle,
              secret,
              sessionStore,
            }),
            connection,
          )()

          expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({
            otherAuthors: [...(newReview.otherAuthors ?? []), name],
          })
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
          expect(canAddAuthors).toHaveBeenCalledWith(user)
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
              body: fc.record({ name: fc.nonEmptyString() }),
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
              moreAuthors: fc.constant('yes'),
              otherAuthors: fc.array(fc.nonEmptyString()),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['moreAuthors'] },
          )
          .filter(newReview => Object.keys(newReview).length < 4),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewAddAuthor(preprintDoi)({
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
                value: expect.stringContaining(
                  `/preprints/doi-${encodeURIComponent(
                    preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                  )}/write-a-prereview`,
                ),
              },
              { type: 'endResponse' },
            ]),
          )
          expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
        },
      ),
    )
  })

  test('when there are no more authors', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        fc.record(
          {
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constant('no'),
            otherAuthors: fc.array(fc.nonEmptyString()),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { requiredKeys: ['moreAuthors'] },
        ),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewAddAuthor(preprintDoi)({
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
        fc.user(),
        fc.boolean(),
        fc.record(
          {
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            otherAuthors: fc.array(fc.nonEmptyString()),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { withDeletedKeys: true },
        ),
        async (preprintDoi, error, [connection, sessionId, secret], user, canAddAuthors, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.left(error)

          const actual = await runMiddleware(
            _.writeReviewAddAuthor(preprintDoi)({
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
      ),
    )
  })

  test("when authors can't be added", async () => {
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
        fc.user(),
        fc.record(
          {
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            otherAuthors: fc.array(fc.nonEmptyString()),
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
            _.writeReviewAddAuthor(preprintDoi)({
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
            _.writeReviewAddAuthor(preprintDoi)({
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
        },
      ),
    )
  })
})
