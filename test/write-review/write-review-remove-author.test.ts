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

describe('writeReviewRemoveAuthor', () => {
  test('when removing the author', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.constant({ removeAuthor: 'yes' }),
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
              otherAuthors: fc.nonEmptyArray(
                fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
                { minLength: 2 },
              ),
              persona: fc.constantFrom('public', 'pseudonym'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['moreAuthors', 'otherAuthors'] },
          )
          .chain(newReview =>
            fc.tuple(fc.constant(newReview), fc.integer({ min: 0, max: newReview.otherAuthors.length - 1 })),
          ),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const canAddAuthors: jest.MockedFunction<CanAddAuthorsEnv['canAddAuthors']> = jest.fn(_ => true)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
            otherAuthors: expect.not.arrayContaining([newReview.otherAuthors[authorIndex]]),
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
      ),
    )
  })

  test('when not removing the author', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.constant({ removeAuthor: 'no' }),
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
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const canAddAuthors: jest.MockedFunction<CanAddAuthorsEnv['canAddAuthors']> = jest.fn(_ => true)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
            otherAuthors: newReview.otherAuthors,
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
      ),
    )
  })

  test('when there are no authors left', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.constant({ removeAuthor: 'yes' }),
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
            otherAuthors: fc.tuple(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { requiredKeys: ['moreAuthors', 'otherAuthors'] },
        ),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const canAddAuthors: jest.MockedFunction<CanAddAuthorsEnv['canAddAuthors']> = jest.fn(_ => true)
          const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
            TE.right(preprintTitle),
          )
          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
              preprintDoi,
              0,
            )({
              canAddAuthors,
              formStore,
              getPreprintTitle,
              secret,
              sessionStore,
            }),
            connection,
          )()

          expect(await formStore.get(`${user.orcid}_${preprintDoi}`)).toMatchObject({ otherAuthors: [] })
          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.SeeOther },
              {
                type: 'setHeader',
                name: 'Location',
                value: `/preprints/doi-${encodeURIComponent(
                  preprintDoi.toLowerCase().replaceAll('-', '+').replaceAll('/', '-'),
                )}/write-a-prereview/more-authors`,
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
        fc
          .record(
            {
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
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
      ),
    )
  })

  test('when the author is not found', async () => {
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
        fc
          .record(
            {
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
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
      ),
    )
  })

  test('when the preprint cannot be loaded', async () => {
    await fc.assert(
      fc.asyncProperty(
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
        async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview, authorIndex) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.left('unavailable' as const)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
      ),
    )
  })

  test('when the preprint cannot be found', async () => {
    await fc.assert(
      fc.asyncProperty(
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
            competingInterests: fc.constantFrom('yes', 'no'),
            competingInterestsDetails: fc.lorem(),
            conduct: fc.constant('yes'),
            moreAuthors: fc.constantFrom('yes', 'no'),
            otherAuthors: fc.array(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { withDeletedKeys: true },
        ),
        fc.integer(),
        async (preprintDoi, [connection, sessionId, secret], user, canAddAuthors, newReview, authorIndex) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.left('not-found' as const)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
            otherAuthors: fc.array(
              fc.record({ name: fc.nonEmptyString(), orcid: fc.orcid() }, { requiredKeys: ['name'] }),
            ),
            persona: fc.constantFrom('public', 'pseudonym'),
            review: fc.nonEmptyString(),
          },
          { withDeletedKeys: true },
        ),
        fc.integer(),
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, newReview, authorIndex) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
        fc.integer(),
        async (preprintDoi, preprintTitle, connection, secret, authorIndex) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
        fc.integer(),
        async (preprintDoi, preprintTitle, connection, secret, authorIndex) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
        },
      ),
    )
  })

  test('without confirming to remove the author', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.preprintDoi(),
        fc.record({ title: fc.html(), language: fc.languageCode() }),
        fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
          fc.tuple(
            fc.connection({
              body: fc.record({ removeAuthor: fc.string() }, { withDeletedKeys: true }),
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
        async (preprintDoi, preprintTitle, [connection, sessionId, secret], user, [newReview, authorIndex]) => {
          const sessionStore = new Keyv()
          await sessionStore.set(sessionId, UserC.encode(user))
          const formStore = new Keyv()
          await formStore.set(`${user.orcid}_${preprintDoi}`, newReview)
          const getPreprintTitle = () => TE.right(preprintTitle)

          const actual = await runMiddleware(
            _.writeReviewRemoveAuthor(
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
      ),
    )
  })
})
