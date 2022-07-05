import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
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
        fc.asyncProperty(fc.connection(), fc.preprint(), async (connection, preprint) => {
          const records: Records = {
            hits: {
              hits: [
                {
                  conceptdoi: '10.5072/zenodo.1061863' as Doi,
                  conceptrecid: 1061863,
                  files: [
                    {
                      links: {
                        self: new URL('http://example.com/file'),
                      },
                      key: 'review.html',
                      type: 'html',
                      size: 58,
                    },
                  ],
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
                    publication_date: new Date('2022-07-05'),
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

          const getPreprint: jest.MockedFunction<_.GetPreprintEnv['getPreprint']> = jest.fn(_ => TE.right(preprint))

          const actual = await runMiddleware(
            _.preprint(preprint.doi)({
              fetch: fetchMock.sandbox().getOnce(
                {
                  url: 'https://zenodo.org/api/records/',
                  query: {
                    communities: 'prereview-reviews',
                    q: `related.identifier:"${preprint.doi}"`,
                    sort: 'mostrecent',
                  },
                },
                {
                  body: RecordsC.encode(records),
                  status: Status.OK,
                },
              ),
              getPreprint,
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
          expect(getPreprint).toHaveBeenCalledWith(preprint.doi)
        }),
      )
    })

    test('when the preprint cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection(), fc.doi(), fc.anything(), async (connection, preprintDoi, error) => {
          const actual = await runMiddleware(
            _.preprint(preprintDoi)({
              fetch: () => Promise.reject('should not be called'),
              getPreprint: () => TE.left(error),
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
        }),
      )
    })

    test('when the reviews cannot be loaded', async () => {
      await fc.assert(
        fc.asyncProperty(fc.connection(), fc.preprint(), async (connection, preprint) => {
          const actual = await runMiddleware(
            _.preprint(preprint.doi)({
              fetch: fetchMock.sandbox().getOnce(
                {
                  url: 'https://zenodo.org/api/records/',
                  query: { communities: 'prereview-reviews', q: `related.identifier:"${preprint.doi}"` },
                },
                {
                  body: undefined,
                  status: Status.ServiceUnavailable,
                },
              ),
              getPreprint: () => TE.right(preprint),
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
