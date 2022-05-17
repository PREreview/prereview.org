import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
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
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async connection => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id: 1061864,
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
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const actual = await runMiddleware(
              _.review({
                fetch: fetchMock.sandbox().getOnce('https://zenodo.org/api/records/1061864', {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
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

    test('when the review cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async connection => {
            const actual = await runMiddleware(
              _.review({
                fetch: fetchMock.sandbox().getOnce('https://zenodo.org/api/records/1061864', {
                  body: undefined,
                  status: Status.ServiceUnavailable,
                }),
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
          fc.connection({ method: fc.requestMethod().filter(method => method !== 'POST') }),
          async connection => {
            const record: Record = {
              conceptdoi: '10.5072/zenodo.1061863' as Doi,
              conceptrecid: 1061863,
              id: 1061864,
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
                resource_type: {
                  type: 'publication',
                  subtype: 'article',
                },
                title: 'Title',
              },
            }

            const actual = await runMiddleware(
              _.review({
                fetch: fetchMock.sandbox().getOnce('https://zenodo.org/api/records/1061864', {
                  body: RecordC.encode(record),
                  status: Status.OK,
                }),
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
