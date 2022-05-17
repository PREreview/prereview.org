import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import { SubmittedDeposition, SubmittedDepositionC, UnsubmittedDeposition, UnsubmittedDepositionC } from 'zenodo-ts'
import * as _ from '../src/write-review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('write-review', () => {
  describe('writeReview', () => {
    test('non-POST request', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.string(),
          async (connection, zenodoApiKey) => {
            const actual = await runMiddleware(
              _.writeReview({ fetch: () => Promise.reject(), zenodoApiKey }),
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

    describe('POST request', () => {
      test('with a string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({ body: fc.record({ review: fc.nonEmptyString() }), method: fc.constant('POST') }),
            fc.string(),
            async (connection, zenodoApiKey) => {
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
                    .postOnce('https://zenodo.org/api/deposit/depositions', {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: Status.Created,
                    })
                    .putOnce('http://example.com/bucket/review.txt', {
                      status: Status.Created,
                    })
                    .postOnce('http://example.com/publish', {
                      body: SubmittedDepositionC.encode(submittedDeposition),
                      status: Status.Accepted,
                    }),
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

      test('with an empty string', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({ body: fc.record({ review: fc.constant('') }), method: fc.constant('POST') }),
            fc.string(),
            async (connection, zenodoApiKey) => {
              const actual = await runMiddleware(
                _.writeReview({ fetch: () => Promise.reject(), zenodoApiKey }),
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

      test('Zenodo is unavailable', async () => {
        await fc.assert(
          fc.asyncProperty(
            fc.connection({ body: fc.record({ review: fc.nonEmptyString() }), method: fc.constant('POST') }),
            fc.string(),
            fc.oneof(
              fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
              fc.error().map(error => Promise.reject(error)),
            ),
            async (connection, zenodoApiKey, response) => {
              const actual = await runMiddleware(
                _.writeReview({
                  fetch: () => response,
                  zenodoApiKey,
                }),
                connection,
              )()

              expect(actual).toStrictEqual(
                E.right([
                  { type: 'setStatus', status: Status.ServiceUnavailable },
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
