import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import { MediaType, Status } from 'hyper-ts'
import { URL } from 'url'
import { Records, RecordsC } from 'zenodo-ts'
import * as _ from '../src/preprint'
import * as fc from './fc'
import { runMiddleware } from './middleware'

describe('preprint', () => {
  describe('preprint', () => {
    test('when the reviews can be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection(), async connection => {
          const records: Records = {
            hits: {
              hits: [
                {
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
                },
              ],
            },
          }

          const actual = await runMiddleware(
            _.preprint({
              fetch: fetchMock.sandbox().getOnce(
                {
                  url: 'https://zenodo.org/api/records/',
                  query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
                },
                {
                  body: RecordsC.encode(records),
                  status: Status.OK,
                },
              ),
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
        }),
      )
    })

    test('when the reviews cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection(), async connection => {
          const actual = await runMiddleware(
            _.preprint({
              fetch: fetchMock.sandbox().getOnce(
                {
                  url: 'https://zenodo.org/api/records/',
                  query: { communities: 'prereview-reviews', q: 'related.identifier:"10.1101/2022.01.13.476201"' },
                },
                {
                  body: undefined,
                  status: Status.ServiceUnavailable,
                },
              ),
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
        }),
      )
    })
  })
})
