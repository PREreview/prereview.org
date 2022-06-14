import cookieSignature from 'cookie-signature'
import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import Keyv from 'keyv'
import { RequestInit } from 'node-fetch'
import { SubmittedDeposition, SubmittedDepositionC, UnsubmittedDeposition, UnsubmittedDepositionC } from 'zenodo-ts'
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
            fc.string(),
            fc.user(),
            async ([connection, sessionId, secret], zenodoApiKey, user) => {
              const sessionStore = new Keyv()
              await sessionStore.set(sessionId, UserC.encode(user))

              const actual = await runMiddleware(
                _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
            fc.uuid(),
            fc.string(),
            fc.string(),
            async (connection, sessionId, secret, zenodoApiKey) => {
              const sessionStore = new Keyv()

              const actual = await runMiddleware(
                _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
                    body: fc.constant({ action: 'post', persona: 'public', review }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.string(),
              fc.user(),
              async ([review, connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const unsubmittedDeposition: UnsubmittedDeposition = {
                  id: 1,
                  links: {
                    bucket: new URL('http://example.com/bucket'),
                    publish: new URL('http://example.com/publish'),
                  },
                  metadata: {
                    creators: [user],
                    description: 'Description',
                    prereserve_doi: {
                      doi: '10.5072/zenodo.1055806' as Doi,
                    },
                    title: 'Title',
                    upload_type: 'publication',
                    publication_type: 'article',
                  },
                  state: 'unsubmitted',
                  submitted: false,
                }
                const submittedDeposition: SubmittedDeposition = {
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
                }
                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: fetchMock
                      .sandbox()
                      .postOnce(
                        {
                          url: 'https://zenodo.org/api/deposit/depositions',
                          body: {
                            metadata: {
                              upload_type: 'publication',
                              publication_type: 'article',
                              title:
                                'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
                              creators: [{ name: user.name, orcid: user.orcid }],
                              communities: [{ identifier: 'prereview-reviews' }],
                              description: `<p>${review}</p>\n`,
                              related_identifiers: [
                                {
                                  scheme: 'doi',
                                  identifier: '10.1101/2022.01.13.476201',
                                  relation: 'reviews',
                                  resource_type: 'publication-preprint',
                                },
                              ],
                            },
                          },
                        },
                        {
                          body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                          status: Status.Created,
                        },
                      )
                      .putOnce(
                        {
                          url: 'http://example.com/bucket/review.txt',
                          headers: { 'Content-Type': 'text/plain' },
                          functionMatcher: (_, req: RequestInit) => req.body === review,
                        },
                        {
                          status: Status.Created,
                        },
                      )
                      .postOnce('http://example.com/publish', {
                        body: SubmittedDepositionC.encode(submittedDeposition),
                        status: Status.Accepted,
                      }),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
                  connection,
                )()

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
                    body: fc.constant({ action: 'post', persona: 'anonymous', review }),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.string(),
              fc.user(),
              async ([review, connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const unsubmittedDeposition: UnsubmittedDeposition = {
                  id: 1,
                  links: {
                    bucket: new URL('http://example.com/bucket'),
                    publish: new URL('http://example.com/publish'),
                  },
                  metadata: {
                    creators: [{ name: 'PREreviewer' }],
                    description: 'Description',
                    prereserve_doi: {
                      doi: '10.5072/zenodo.1055806' as Doi,
                    },
                    title: 'Title',
                    upload_type: 'publication',
                    publication_type: 'article',
                  },
                  state: 'unsubmitted',
                  submitted: false,
                }
                const submittedDeposition: SubmittedDeposition = {
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
                }
                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: fetchMock
                      .sandbox()
                      .postOnce(
                        {
                          url: 'https://zenodo.org/api/deposit/depositions',
                          body: {
                            metadata: {
                              upload_type: 'publication',
                              publication_type: 'article',
                              title:
                                'Review of “The role of LHCBM1 in non-photochemical quenching in Chlamydomonas reinhardtii”',
                              creators: [{ name: 'PREreviewer' }],
                              communities: [{ identifier: 'prereview-reviews' }],
                              description: `<p>${review}</p>\n`,
                              related_identifiers: [
                                {
                                  scheme: 'doi',
                                  identifier: '10.1101/2022.01.13.476201',
                                  relation: 'reviews',
                                  resource_type: 'publication-preprint',
                                },
                              ],
                            },
                          },
                        },
                        {
                          body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                          status: Status.Created,
                        },
                      )
                      .putOnce(
                        {
                          url: 'http://example.com/bucket/review.txt',
                          headers: { 'Content-Type': 'text/plain' },
                          functionMatcher: (_, req: RequestInit) => req.body === review,
                        },
                        {
                          status: Status.Created,
                        },
                      )
                      .postOnce('http://example.com/publish', {
                        body: SubmittedDepositionC.encode(submittedDeposition),
                        status: Status.Accepted,
                      }),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
                  connection,
                )()

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
                body: fc.record({ action: fc.constant('post'), persona: fc.constant('public'), review: fc.lorem() }),
                method: fc.constant('POST'),
              }),
              fc.string(),
              fc.string(),
              async (connection, secret, zenodoApiKey) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => Promise.reject(),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
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
                      { action: fc.constant('post'), persona: fc.constant('public'), review: fc.constant('') },
                      { requiredKeys: ['action', 'persona'] },
                    ),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
                      { action: fc.constant('post'), persona: fc.lorem(), review: fc.lorem() },
                      { requiredKeys: ['action', 'review'] },
                    ),
                    headers: fc.constant({ Cookie: `session=${cookieSignature.sign(sessionId, secret)}` }),
                    method: fc.constant('POST'),
                  }),
                  fc.constant(sessionId),
                  fc.constant(secret),
                ),
              ),
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
              fc.string(),
              fc.oneof(
                fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
                fc.error().map(error => Promise.reject(error)),
              ),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, response, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => response,
                    secret,
                    sessionStore,
                    zenodoApiKey,
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
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => Promise.reject(),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
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
              fc.string(),
              async (connection, secret, zenodoApiKey) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => Promise.reject(),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
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
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => Promise.reject(),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
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
              fc.string(),
              async (connection, secret, zenodoApiKey) => {
                const sessionStore = new Keyv()

                const actual = await runMiddleware(
                  _.writeReview({
                    fetch: () => Promise.reject(),
                    secret,
                    sessionStore,
                    zenodoApiKey,
                  }),
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
              fc.string(),
              fc.user(),
              async ([connection, sessionId, secret], zenodoApiKey, user) => {
                const sessionStore = new Keyv()
                await sessionStore.set(sessionId, UserC.encode(user))

                const actual = await runMiddleware(
                  _.writeReview({ fetch: () => Promise.reject(), secret, sessionStore, zenodoApiKey }),
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
