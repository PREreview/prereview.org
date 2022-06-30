import cookieSignature from 'cookie-signature'
import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { html } from '../src/html'
import { UserC } from '../src/user'
import * as _ from '../src/write-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('write-review', () => {
  describe('writeReview', () => {
    describe('when there is a session', () => {
      test('there is completed form already', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.doi(),
            fc.html(),
            fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
              fc.tuple(
                fc.connection({
                  headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                  method: fc.requestMethod().filter(method => method !== 'POST'),
                }),
                fc.constant(sessionId),
                fc.constant(secret),
              ),
            ),
            fc.record({
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.lorem(),
            }),
            fc.user(),
            async (preprintDoi, preprintTitle, [connection, sessionId, secret], newReview, user) => {
              const sessionStore = new Keyv()
              await sessionStore.set(sessionId, UserC.encode(user))
              const formStore = new Keyv()
              await formStore.set(user.orcid, newReview)
              const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
                TE.right(preprintTitle),
              )

              const actual = await runMiddleware(
                _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
                connection,
              )()

              expect(actual).toStrictEqual(
                E.right([
                  { type: 'setStatus', status: Status.SeeOther },
                  {
                    type: 'setHeader',
                    name: 'Location',
                    value: '/preprints/doi-10.1101-2022.01.13.476201/review/post',
                  },
                  { type: 'endResponse' },
                ]),
              )
              expect(getPreprintTitle).toHaveBeenCalledWith(preprintDoi)
            },
          ),
        )
      })

      test("there isn't a form", async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.doi(),
            fc.html(),
            fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
              fc.tuple(
                fc.connection({
                  headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                  method: fc.requestMethod().filter(method => method !== 'POST'),
                }),
                fc.constant(sessionId),
                fc.constant(secret),
              ),
            ),
            fc.user(),
            async (preprintDoi, preprintTitle, [connection, sessionId, secret], user) => {
              const sessionStore = new Keyv()
              await sessionStore.set(sessionId, UserC.encode(user))
              const formStore = new Keyv()
              const getPreprintTitle = () => TE.right(preprintTitle)

              const actual = await runMiddleware(
                _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
                connection,
              )()

              expect(actual).toStrictEqual(
                E.right([
                  { type: 'setStatus', status: Status.SeeOther },
                  {
                    type: 'setHeader',
                    name: 'Location',
                    value: '/preprints/doi-10.1101-2022.01.13.476201/review/review',
                  },
                  { type: 'endResponse' },
                ]),
              )
            },
          ),
        )
      })
    })

    test("when there isn't a session", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.doi(),
          fc.html(),
          fc.connection({
            headers: fc.constant({}),
            method: fc.requestMethod().filter(method => method !== 'POST'),
          }),
          fc.string(),
          async (preprintDoi, preprintTitle, connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()
            const getPreprintTitle = () => TE.right(preprintTitle)

            const actual = await runMiddleware(
              _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.OK },
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
          fc.doi(),
          fc.anything(),
          fc.connection({
            headers: fc.constant({}),
            method: fc.requestMethod().filter(method => method !== 'POST'),
          }),
          fc.string(),
          async (preprintDoi, error, connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()
            const getPreprintTitle = () => TE.left(error)

            const actual = await runMiddleware(
              _.writeReview(preprintDoi)({ formStore, getPreprintTitle, secret, sessionStore }),
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
  })

  describe('writeReviewReview', () => {
    test('when the form is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(fc.lorem(), fc.uuid(), fc.string()).chain(([review, sessionId, secret]) =>
            fc.tuple(
              fc.constant(review),
              fc.connection({
                body: fc.constant({ review }),
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['conduct', 'persona'] },
          ),
          async ([review, connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewReview({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ review })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: '/preprints/doi-10.1101-2022.01.13.476201/review/post',
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(fc.lorem(), fc.uuid(), fc.string()).chain(([review, sessionId, secret]) =>
            fc.tuple(
              fc.constant(review),
              fc.connection({
                body: fc.constant({ review }),
                headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                method: fc.constant('POST'),
              }),
              fc.constant(sessionId),
              fc.constant(secret),
            ),
          ),
          fc.user(),
          fc.oneof(
            fc.record(
              {
                persona: fc.constantFrom('public', 'anonymous'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            ),
            fc.record(
              {
                conduct: fc.constant('yes'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            ),
          ),
          async ([review, connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewReview({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ review })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: expect.stringMatching(/^\/preprints\/doi-10\.1101-2022\.01\.13\.476201\/review\//),
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
          fc.connection({ body: fc.record({ review: fc.lorem() }), method: fc.constant('POST') }),
          fc.string(),
          async (connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()

            const actual = await runMiddleware(_.writeReviewReview({ formStore, secret, sessionStore }), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('without a review', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.record({ review: fc.constant('') }, { withDeletedKeys: true }),
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          ),
          async ([connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewReview({ formStore, secret, sessionStore }), connection)()

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

  describe('writeReviewPersona', () => {
    test('when the form is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .tuple(fc.constantFrom('public', 'anonymous'), fc.uuid(), fc.string())
            .chain(([persona, sessionId, secret]) =>
              fc.tuple(
                fc.constant(persona),
                fc.connection({
                  body: fc.constant({ persona }),
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['conduct', 'review'] },
          ),
          async ([persona, connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewPersona({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ persona })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: '/preprints/doi-10.1101-2022.01.13.476201/review/post',
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc
            .tuple(fc.constantFrom('public', 'anonymous'), fc.uuid(), fc.string())
            .chain(([persona, sessionId, secret]) =>
              fc.tuple(
                fc.constant(persona),
                fc.connection({
                  body: fc.constant({ persona }),
                  headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                  method: fc.constant('POST'),
                }),
                fc.constant(sessionId),
                fc.constant(secret),
              ),
            ),
          fc.user(),
          fc.oneof(
            fc.record(
              {
                conduct: fc.constant('yes'),
                persona: fc.constantFrom('public', 'anonymous'),
              },
              { withDeletedKeys: true },
            ),
            fc.record(
              {
                persona: fc.constantFrom('public', 'anonymous'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            ),
          ),
          async ([persona, connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewPersona({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ persona })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: expect.stringMatching(/^\/preprints\/doi-10\.1101-2022\.01\.13\.476201\/review\//),
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
          fc.connection({ body: fc.constant({ conduct: 'yes' }), method: fc.constant('POST') }),
          fc.string(),
          async (connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()

            const actual = await runMiddleware(_.writeReviewPersona({ formStore, secret, sessionStore }), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('without a persona', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
            fc.tuple(
              fc.connection({
                body: fc.record({ persona: fc.string() }, { withDeletedKeys: true }),
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          ),
          async ([connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewPersona({ formStore, secret, sessionStore }), connection)()

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

  describe('writeReviewConduct', () => {
    test('when the form is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { requiredKeys: ['persona', 'review'] },
          ),
          async ([connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewConduct({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ conduct: 'yes' })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: '/preprints/doi-10.1101-2022.01.13.476201/review/post',
                },
                { type: 'endResponse' },
              ]),
            )
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc.oneof(
            fc.record(
              {
                conduct: fc.constant('yes'),
                persona: fc.constantFrom('public', 'anonymous'),
              },
              { withDeletedKeys: true },
            ),
            fc.record(
              {
                conduct: fc.constant('yes'),
                review: fc.nonEmptyString(),
              },
              { withDeletedKeys: true },
            ),
          ),
          async ([connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewConduct({ formStore, secret, sessionStore }), connection)()

            expect(await formStore.get(user.orcid)).toMatchObject({ conduct: 'yes' })
            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: expect.stringMatching(/^\/preprints\/doi-10\.1101-2022\.01\.13\.476201\/review\//),
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
          fc.connection({ body: fc.constant({ conduct: 'yes' }), method: fc.constant('POST') }),
          fc.string(),
          async (connection, secret) => {
            const sessionStore = new Keyv()
            const formStore = new Keyv()

            const actual = await runMiddleware(_.writeReviewConduct({ formStore, secret, sessionStore }), connection)()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
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
              conduct: fc.constant('yes'),
              persona: fc.constantFrom('public', 'anonymous'),
              review: fc.nonEmptyString(),
            },
            { withDeletedKeys: true },
          ),
          async ([connection, sessionId, secret], user, newReview) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(_.writeReviewConduct({ formStore, secret, sessionStore }), connection)()

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
            conduct: fc.constant('yes'),
            persona: fc.constantFrom('public', 'anonymous'),
            review: fc.lorem(),
          }),
          fc.user(),
          async ([connection, sessionId, secret], newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

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
              _.writeReviewPost({ createRecord, formStore, secret, sessionStore }),
              connection,
            )()

            expect(createRecord).toHaveBeenCalledWith({
              conduct: 'yes',
              persona: newReview.persona,
              preprint: {
                doi: '10.1101-2022.01.13.476201',
                title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
              },
              review: newReview.review,
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
          },
        ),
      )
    })

    test('when the form is incomplete', async () => {
      await fc.assert(
        fc.asyncProperty(
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
          fc.oneof(
            fc.record(
              {
                conduct: fc.string(),
                persona: fc.constantFrom('public', 'anonymous'),
                review: fc.lorem(),
              },
              { requiredKeys: ['persona', 'review'] },
            ),
            fc.record(
              {
                conduct: fc.constant('yes'),
                persona: fc.string(),
                review: fc.lorem(),
              },
              { requiredKeys: ['conduct', 'review'] },
            ),
            fc.record(
              {
                conduct: fc.constant('yes'),
                persona: fc.constantFrom('public', 'anonymous'),
                review: fc.constant(''),
              },
              { requiredKeys: ['conduct', 'persona'] },
            ),
          ),
          fc.user(),
          async ([connection, sessionId, secret], newPrereview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newPrereview)

            const actual = await runMiddleware(
              _.writeReviewPost({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.SeeOther },
                {
                  type: 'setHeader',
                  name: 'Location',
                  value: expect.stringMatching(/^\/preprints\/doi-10\.1101-2022\.01\.13\.476201\/review\//),
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
        fc.asyncProperty(fc.connection({ method: fc.constant('POST') }), fc.string(), async (connection, secret) => {
          const sessionStore = new Keyv()
          const formStore = new Keyv()

          const actual = await runMiddleware(
            _.writeReviewPost({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
            connection,
          )()

          expect(actual).toStrictEqual(
            E.right([
              { type: 'setStatus', status: Status.SeeOther },
              { type: 'setHeader', name: 'Location', value: '/preprints/doi-10.1101-2022.01.13.476201/review' },
              { type: 'endResponse' },
            ]),
          )
        }),
      )
    })

    test('Zenodo is unavailable', async () => {
      await fc.assert(
        fc.asyncProperty(
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
            conduct: fc.constant('yes'),
            persona: fc.constantFrom('public', 'anonymous'),
            review: fc.lorem(),
          }),
          fc.user(),
          async ([connection, sessionId, secret], response, newReview, user) => {
            const sessionStore = new Keyv()
            await sessionStore.set(sessionId, UserC.encode(user))
            const formStore = new Keyv()
            await formStore.set(user.orcid, newReview)

            const actual = await runMiddleware(
              _.writeReviewPost({ createRecord: () => TE.left(response), formStore, secret, sessionStore }),
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
