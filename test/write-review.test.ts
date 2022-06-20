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

              const actual = await runMiddleware(
                _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

              const actual = await runMiddleware(
                _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
              fc.tuple(fc.lorem(), fc.uuid(), fc.string()).chain(([review, sessionId, secret]) =>
                fc.tuple(
                  fc.constant(review),
                  fc.connection({
                    body: fc.constant({ action: 'post', conduct: 'yes', persona: 'public', review }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.user(),
              async ([review, connection, sessionId, secret], user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

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

                const actual = await runMiddleware(_.writeReview({ createRecord, secret, sessionStore }), connection)()

                expect(createRecord).toHaveBeenCalledWith({
                  conduct: 'yes',
                  persona: 'public',
                  review,
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
              fc.tuple(fc.lorem(), fc.uuid(), fc.string()).chain(([review, sessionId, secret]) =>
                fc.tuple(
                  fc.constant(review),
                  fc.connection({
                    body: fc.constant({ action: 'post', conduct: 'yes', persona: 'anonymous', review }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.user(),
              async ([review, connection, sessionId, secret], user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

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

                const actual = await runMiddleware(_.writeReview({ createRecord, secret, sessionStore }), connection)()

                expect(createRecord).toHaveBeenCalledWith({
                  conduct: 'yes',
                  persona: 'anonymous',
                  review,
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
                body: fc.record({
                  action: fc.constant('post'),
                  conduct: fc.constant('yes'),
                  persona: fc.constant('public'),
                  review: fc.lorem(),
                }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                      {
                        action: fc.constant('post'),
                        conduct: fc.constant('yes'),
                        persona: fc.constant('public'),
                        review: fc.constant(''),
                      },
                      { requiredKeys: ['action', 'conduct', 'persona'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                    body: fc.record(
                      {
                        action: fc.constant('post'),
                        conduct: fc.constant('yes'),
                        persona: fc.lorem(),
                        review: fc.lorem(),
                      },
                      { requiredKeys: ['action', 'conduct', 'review'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                    body: fc.record(
                      {
                        action: fc.constant('post'),
                        conduct: fc.string(),
                        persona: fc.constant('public'),
                        review: fc.lorem(),
                      },
                      { requiredKeys: ['action', 'persona', 'review'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                    body: fc.record({
                      action: fc.constant('post'),
                      conduct: fc.constant('yes'),
                      persona: fc.constant('public'),
                      review: fc.nonEmptyString(),
                    }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.oneof(fc.fetchResponse({ status: fc.integer({ min: 400 }) }), fc.error()),
              fc.user(),
              async ([connection, sessionId, secret], response, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(response), secret, sessionStore }),
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
                    body: fc.record({
                      action: fc.constant('conduct'),
                      conduct: fc.constant('yes'),
                      persona: fc.constantFrom('public', 'anonymous'),
                      review: fc.lorem(),
                    }),
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                body: fc.record({
                  action: fc.constant('conduct'),
                  conduct: fc.constant('yes'),
                  persona: fc.constantFrom('public', 'anonymous'),
                  review: fc.lorem(),
                }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                      {
                        action: fc.constant('conduct'),
                        conduct: fc.string(),
                        persona: fc.constantFrom('public', 'anonymous'),
                        review: fc.lorem(),
                      },
                      { requiredKeys: ['action', 'persona', 'review'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

        test('with an empty review', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.record(
                      {
                        action: fc.constant('conduct'),
                        conduct: fc.constant('yes'),
                        persona: fc.constantFrom('public', 'anonymous'),
                        review: fc.constant(''),
                      },
                      { requiredKeys: ['action', 'conduct', 'persona'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

        test('without a persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.record(
                      {
                        action: fc.constant('conduct'),
                        conduct: fc.constant('yes'),
                        persona: fc.lorem(),
                        review: fc.lorem(),
                      },
                      { requiredKeys: ['action', 'conduct', 'review'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

      describe('persona action', () => {
        test('with a persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.record({
                      action: fc.constant('persona'),
                      persona: fc.constantFrom('public', 'anonymous'),
                      review: fc.lorem(),
                    }),
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                body: fc.record({
                  action: fc.constant('persona'),
                  persona: fc.constantFrom('public', 'anonymous'),
                  review: fc.lorem(),
                }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                      {
                        action: fc.constant('persona'),
                        persona: fc.constantFrom('public', 'anonymous'),
                        review: fc.constant(''),
                      },
                      { requiredKeys: ['action', 'persona'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

        test('without a persona', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.record(
                      { action: fc.constant('persona'), persona: fc.lorem(), review: fc.lorem() },
                      { requiredKeys: ['action', 'review'] },
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

      describe('review action', () => {
        test('with a review', async () => {
          await fc.assert(
            fc.asyncProperty(
              fc.tuple(fc.uuid(), fc.string()).chain(([sessionId, secret]) =>
                fc.tuple(
                  fc.connection({
                    body: fc.record({ action: fc.constant('review'), review: fc.lorem() }),
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
                body: fc.record({ action: fc.constant('review'), review: fc.lorem() }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              async (connection, secret) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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

                const actual = await runMiddleware(
                  _.writeReview({ createRecord: () => TE.left(''), secret, sessionStore }),
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
