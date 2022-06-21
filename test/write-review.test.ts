import cookieSignature from 'cookie-signature'
import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { UserC } from '../src/user'
import * as _ from '../src/write-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('write-review', () => {
  describe('writeReview', () => {
    describe('non-POST request', () => {
      test('when there is a session', async () => {
        await fc.assert(
          fc.asyncProperty(
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
            async ([connection, sessionId, secret], user) => {
              const sessionStore = new Keyv()
              await sessionStore.set(sessionId, UserC.encode(user))
              const formStore = new Keyv()

              const actual = await runMiddleware(
                _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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

      test("when there isn't a session", async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({
              headers: fc.constant({}),
              method: fc.requestMethod().filter(method => method !== 'POST'),
            }),
            fc.string(),
            async (connection, secret) => {
              const sessionStore = new Keyv()
              const formStore = new Keyv()

              const actual = await runMiddleware(
                _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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
    })

    describe('POST request', () => {
      describe('post action', () => {
        test('as a public persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.record({
                conduct: fc.constant('yes'),
                persona: fc.constant('public'),
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
                  _.writeReview({ createRecord, formStore, secret, sessionStore }),
                  connection,
                )()

                expect(createRecord).toHaveBeenCalledWith({
                  conduct: 'yes',
                  persona: 'public',
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

        test('as an anonymous persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.record({
                conduct: fc.constant('yes'),
                persona: fc.constant('anonymous'),
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
                      creators: [{ name: 'PREreviewer' }],
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
                  _.writeReview({ createRecord, formStore, secret, sessionStore }),
                  connection,
                )()

                expect(createRecord).toHaveBeenCalledWith({
                  conduct: 'yes',
                  persona: 'anonymous',
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

        test("when there isn't a session", async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.connection({
                body: fc.constant({ action: 'post' }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()
                const formStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                  connection,
                )()

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

        test('with an empty review', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.record(
                {
                  conduct: fc.constant('yes'),
                  persona: fc.constantFrom('public', 'anonymous'),
                  review: fc.constant(''),
                },
                { requiredKeys: ['conduct', 'persona'] },
              ),
              fc.user(),
              async ([connection, sessionId, secret], newPrereview, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))
                const formStore = new Keyv()
                await formStore.set(user.orcid, newPrereview)

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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

        test('without a persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.record(
                {
                  conduct: fc.constant('yes'),
                  persona: fc.lorem(),
                  review: fc.lorem(),
                },
                { requiredKeys: ['conduct', 'review'] },
              ),
              fc.user(),
              async ([connection, sessionId, secret], newReview, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))
                const formStore = new Keyv()
                await formStore.set(user.orcid, newReview)

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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

        test('without agreement to the Code of Conduct', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.record(
                {
                  conduct: fc.lorem(),
                  persona: fc.constantFrom('public', 'anonymous'),
                  review: fc.lorem(),
                },
                { requiredKeys: ['persona', 'review'] },
              ),
              fc.user(),
              async ([connection, sessionId, secret], newReview, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))
                const formStore = new Keyv()
                await formStore.set(user.orcid, newReview)

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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

        test('Zenodo is unavailable', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'post' }),
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
                  _.writeReview({ createRecord: () => TE.left(response), formStore, secret, sessionStore }),
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

      describe('conduct action', () => {
        test('with agreement to the Code of Conduct', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.constant({ action: 'conduct', conduct: 'yes' }),
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                  connection,
                )()

                expect(await formStore.get(user.orcid)).toMatchObject({ conduct: 'yes' })
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

        test("when there isn't a session", async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.connection({
                body: fc.constant({ action: 'conduct', conduct: 'yes' }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()
                const formStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                  connection,
                )()

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
                    body: fc.record(
                      { action: fc.constant('conduct'), conduct: fc.string() },
                      { requiredKeys: ['action'] },
                    ),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.user(),
              async ([connection, sessionId, secret], user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))
                const formStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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

        describe('persona action', () => {
          test('with a persona', async () => {
            await fc.assert(
              fc.asyncProperty(
                fc
                  .tuple(fc.constantFrom('public', 'anonymous'), fc.uuid(), fc.string())
                  .chain(([persona, sessionId, secret]) =>
                    fc.tuple(
                      fc.constant(persona),
                      fc.connection({
                        body: fc.constant({ action: 'persona', persona }),
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
                async ([persona, connection, sessionId, secret], user, newReview) => {
                  const sessionStore = new Keyv()
                  await sessionStore.set(sessionId, UserC.encode(user))
                  const formStore = new Keyv()
                  await formStore.set(user.orcid, newReview)

                  const actual = await runMiddleware(
                    _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                    connection,
                  )()

                  expect(await formStore.get(user.orcid)).toMatchObject({ persona })
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

          test("when there isn't a session", async () => {
            await fc.assert(
              fc.asyncProperty(
                fc.connection({
                  body: fc.record({ action: fc.constant('persona'), persona: fc.constantFrom('public', 'anonymous') }),
                  method: fc.constant('POST'),
                }),
                fc.string(),
                async (connection, secret) => {
                  const sessionStore = new Keyv()
                  const formStore = new Keyv()

                  const actual = await runMiddleware(
                    _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                    connection,
                  )()

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
        })

        describe('review action', () => {
          test('with a review', async () => {
            await fc.assert(
              fc.asyncProperty(
                fc.tuple(fc.lorem(), fc.uuid(), fc.string()).chain(([review, sessionId, secret]) =>
                  fc.tuple(
                    fc.constant(review),
                    fc.connection({
                      body: fc.constant({ action: 'review', review }),
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
                async ([review, connection, sessionId, secret], user, newReview) => {
                  const sessionStore = new Keyv()
                  await sessionStore.set(sessionId, UserC.encode(user))
                  const formStore = new Keyv()
                  await formStore.set(user.orcid, newReview)

                  const actual = await runMiddleware(
                    _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                    connection,
                  )()

                  expect(await formStore.get(user.orcid)).toMatchObject({ review })
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

          test("when there isn't a session", async () => {
            await fc.assert(
              fc.asyncProperty(
                fc.connection({
                  body: fc.record({ action: fc.constant('review'), review: fc.lorem() }),
                  method: fc.constant('POST'),
                }),
                fc.string(),
                async (connection, secret) => {
                  const sessionStore = new Keyv()
                  const formStore = new Keyv()

                  const actual = await runMiddleware(
                    _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
                    connection,
                  )()

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

          test('with an empty review', async () => {
            await fc.assert(
              fc.asyncProperty(
                fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                  fc.tuple(
                    fc.connection({
                      body: fc.record(
                        { action: fc.constant('review'), review: fc.constant('') },
                        { requiredKeys: ['action'] },
                      ),
                      headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                      method: fc.constant('POST'),
                    }),
                    fc.constant(sessionId),
                    fc.constant(secret),
                  ),
                ),
                fc.user(),
                async ([connection, sessionId, secret], user) => {
                  const sessionStore = new Keyv()
                  await sessionStore.set(sessionId, UserC.encode(user))
                  const formStore = new Keyv()

                  const actual = await runMiddleware(
                    _.writeReview({ createRecord: () => TE.left(''), formStore, secret, sessionStore }),
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
      })
    })
  })
})
