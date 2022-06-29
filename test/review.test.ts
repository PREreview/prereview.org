import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { MediaType, Status } from 'hyper-ts'
import { URL } from 'url'
import { Record, RecordC } from 'zenodo-ts'
import * as _ from '../src/review'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('review', () => {
  describe('review', () => {
    test('when the review can be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.record({
            doi: fc.doi(),
            title: fc.html(),
          }),
          async (id, connection, preprint) => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: preprint.doi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const getPreprintTitle: jest.MockedFunction<_.GetPreprintTitleEnv['getPreprintTitle']> = jest.fn(_ =>
              TE.right(preprint.title),
            )

            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
                getPreprintTitle,
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
            expect(getPreprintTitle).toHaveBeenCalledWith(preprint.doi)
          },
        ),
      )
    })

    test('when the review is not found', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async (id, connection) => {
            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: undefined,
                  status: Status.NotFound,
                }),
                getPreprintTitle: () => () => Promise.reject('should not be called'),
              }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.NotFound },
                { type: 'setHeader', name: 'cache-control', value: 'no-store, must-revalidate' },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })

    test('when the review cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async (id, connection) => {
            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: undefined,
                  status: Status.ServiceUnavailable,
                }),
                getPreprintTitle: () => () => Promise.reject('should not be called'),
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

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.doi(),
          fc.anything(),
          async (id, connection, preprintDoi, error) => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: preprintDoi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
                getPreprintTitle: () => TE.left(error),
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

    test('when the record is not in the community', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          fc.doi(),
          async (id, connection, preprintDoi) => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: preprintDoi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
                getPreprintTitle: () => () => Promise.reject('should not be called'),
              }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.NotFound },
                { type: 'setHeader', name: 'cache-control', value: 'no-store, must-revalidate' },
                { type: 'setHeader', name: 'Content-Type', value: MediaType.textHTML },
                { type: 'setBody', body: expect.anything() },
              ]),
            )
          },
        ),
      )
    })

    test('when the record does not review a preprint with a DOI', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer(),
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async (id, connection) => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: {
                  id: 'CC-BY-4.0',
                },
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: 'not-a-doi',
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const actual = await runMiddleware(
              _.review(id)({
                fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
                getPreprintTitle: () => () => Promise.reject('should not be called'),
              }),
              connection,
            )()

            expect(actual).toStrictEqual(
              E.right([
                { type: 'setStatus', status: Status.NotFound },
                { type: 'setHeader', name: 'cache-control', value: 'no-store, must-revalidate' },
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
