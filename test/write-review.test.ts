import { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import { Response } from 'node-fetch'
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
                  fetch: url => {
                    switch (url) {
                      case 'https://zenodo.org/api/deposit/depositions':
                        return Promise.resolve(
                          new Response(UnsubmittedDepositionC.encode(unsubmittedDeposition), {
                            status: Status.Created,
                          }),
                        )
                      case 'http://example.com/bucket/review.txt':
                        return Promise.resolve(new Response(undefined, { status: Status.Created }))
                      case 'http://example.com/publish':
                        return Promise.resolve(
                          new Response(SubmittedDepositionC.encode(submittedDeposition), { status: Status.Accepted }),
                        )
                    }

                    return Promise.reject(new Response(undefined, { status: Status.NotFound }))
                  },
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
    })
  })
})
