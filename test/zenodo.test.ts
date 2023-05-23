import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import {
  type Record,
  RecordC,
  type Records,
  RecordsC,
  type SubmittedDeposition,
  SubmittedDepositionC,
  type UnsubmittedDeposition,
  UnsubmittedDepositionC,
} from 'zenodo-ts'
import { plainText, rawHtml } from '../src/html'
import type { NewPrereview } from '../src/write-review'
import * as _ from '../src/zenodo'
import * as fc from './fc'

import PlainDate = Temporal.PlainDate

describe('getRecentPrereviewsFromZenodo', () => {
  test.prop([fc.integer({ min: 1 }), fc.preprintTitle(), fc.preprintTitle()])(
    'when the PREreviews can be loaded',
    async (page, preprint1, preprint2) => {
      const records: Records = {
        hits: {
          total: 2,
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
                language: 'eng',
                license: {
                  id: 'CC-BY-4.0',
                },
                publication_date: new Date('2022-07-04'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: '10.1101/2022.01.13.476201' as Doi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'peerreview',
                },
                title: 'Title',
              },
            },
            {
              conceptdoi: '10.5072/zenodo.1065235' as Doi,
              conceptrecid: 1065235,
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
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: {
                  id: 'CC-BY-4.0',
                },
                publication_date: new Date('2022-07-05'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: '10.1101/2022.02.14.480364' as Doi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'peerreview',
                },
                title: 'Title',
              },
            },
          ],
        },
      }

      const actual = await _.getRecentPrereviewsFromZenodo(page)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'https://zenodo.org/api/records/',
            query: {
              communities: 'prereview-reviews',
              page,
              size: '5',
              sort: 'mostrecent',
              subtype: 'peerreview',
            },
          },
          {
            body: RecordsC.encode(records),
            status: Status.OK,
          },
        ),
        getPreprintTitle: id =>
          match(id.value as unknown)
            .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
            .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
            .otherwise(() => TE.left('not-found')),
      })()

      expect(actual).toStrictEqual(
        E.right({
          currentPage: page,
          recentPrereviews: [
            {
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 4),
              preprint: preprint1,
            },
            {
              id: 1065236,
              reviewers: ['Josiah Carberry'],
              published: new Temporal.PlainDate(2022, 7, 5),
              preprint: preprint2,
            },
          ],
          totalPages: 1,
        }),
      )
    },
  )

  test.prop([fc.integer({ min: 1 }), fc.preprintTitle()])(
    'revalidates if the PREreviews are stale',
    async (page, preprint) => {
      const records: Records = {
        hits: {
          total: 1,
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
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: '10.1101/2022.02.14.480364' as Doi,
                    relation: 'reviews',
                    resource_type: 'publication-preprint',
                  },
                ],
                resource_type: {
                  type: 'publication',
                  subtype: 'peerreview',
                },
                title: 'Title',
              },
            },
          ],
        },
      }

      const fetch = fetchMock
        .sandbox()
        .getOnce(
          (url, { cache }) =>
            url ===
              `https://zenodo.org/api/records/?${new URLSearchParams({
                communities: 'prereview-reviews',
                page: page.toString(),
                size: '5',
                sort: 'mostrecent',
                subtype: 'peerreview',
              }).toString()}` && cache === 'force-cache',
          {
            body: RecordsC.encode(records),
            headers: { 'X-Local-Cache-Status': 'stale' },
          },
        )
        .getOnce(
          (url, { cache }) =>
            url ===
              `https://zenodo.org/api/records/?${new URLSearchParams({
                communities: 'prereview-reviews',
                page: page.toString(),
                size: '5',
                sort: 'mostrecent',
                subtype: 'peerreview',
              }).toString()}` && cache === 'no-cache',
          { throws: new Error('Network error') },
        )

      const actual = await _.getRecentPrereviewsFromZenodo(page)({
        fetch,
        getPreprintTitle: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual(
        E.right({
          currentPage: page,
          recentPrereviews: [
            {
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 5),
              preprint,
            },
          ],
          totalPages: 1,
        }),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.integer({ min: 1 }),
    fc.preprintTitle(),
    fc.constantFrom('not-found' as const, 'unavailable' as const),
  ])('when a preprint cannot be loaded', async (page, preprint, error) => {
    const records: Records = {
      hits: {
        total: 2,
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
              language: 'eng',
              license: {
                id: 'CC-BY-4.0',
              },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: '10.1101/2022.01.13.476201' as Doi,
                  relation: 'reviews',
                  resource_type: 'publication-preprint',
                },
              ],
              resource_type: {
                type: 'publication',
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
          {
            conceptdoi: '10.5072/zenodo.1065235' as Doi,
            conceptrecid: 1065235,
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
            id: 1065236,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'Josiah Carberry' }],
              description: 'Description',
              doi: '10.5281/zenodo.1065236' as Doi,
              language: 'eng',
              license: {
                id: 'CC-BY-4.0',
              },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: '10.1101/2022.02.14.480364' as Doi,
                  relation: 'reviews',
                  resource_type: 'publication-preprint',
                },
              ],
              resource_type: {
                type: 'publication',
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
        ],
      },
    }

    const actual = await _.getRecentPrereviewsFromZenodo(page)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'https://zenodo.org/api/records/',
          query: {
            communities: 'prereview-reviews',
            page,
            size: '5',
            sort: 'mostrecent',
            subtype: 'peerreview',
          },
        },
        {
          body: RecordsC.encode(records),
          status: Status.OK,
        },
      ),
      getPreprintTitle: id =>
        match(id.value as unknown)
          .with('10.1101/2022.01.13.476201', () => TE.right(preprint))
          .otherwise(() => TE.left(error)),
    })()

    expect(actual).toStrictEqual(
      E.right({
        currentPage: page,
        recentPrereviews: [
          {
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 4),
            preprint: preprint,
          },
        ],
        totalPages: 1,
      }),
    )
  })

  test.prop([
    fc.integer({ min: 1 }),
    fc.constantFrom('not-found' as const, 'unavailable' as const),
    fc.constantFrom('not-found' as const, 'unavailable' as const),
  ])('when none of the preprints can be loaded', async (page, error1, error2) => {
    const records: Records = {
      hits: {
        total: 2,
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
              language: 'eng',
              license: {
                id: 'CC-BY-4.0',
              },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: '10.1101/2022.01.13.476201' as Doi,
                  relation: 'reviews',
                  resource_type: 'publication-preprint',
                },
              ],
              resource_type: {
                type: 'publication',
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
          {
            conceptdoi: '10.5072/zenodo.1065235' as Doi,
            conceptrecid: 1065235,
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
            id: 1065236,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'Josiah Carberry' }],
              description: 'Description',
              doi: '10.5281/zenodo.1065236' as Doi,
              language: 'eng',
              license: {
                id: 'CC-BY-4.0',
              },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: '10.1101/2022.02.14.480364' as Doi,
                  relation: 'reviews',
                  resource_type: 'publication-preprint',
                },
              ],
              resource_type: {
                type: 'publication',
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
        ],
      },
    }

    const actual = await _.getRecentPrereviewsFromZenodo(page)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'https://zenodo.org/api/records/',
          query: {
            communities: 'prereview-reviews',
            page,
            size: '5',
            sort: 'mostrecent',
            subtype: 'peerreview',
          },
        },
        {
          body: RecordsC.encode(records),
          status: Status.OK,
        },
      ),
      getPreprintTitle: id =>
        match(id.value as unknown)
          .with('10.1101/2022.01.13.476201', () => TE.left(error1))
          .otherwise(() => TE.left(error2)),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })

  test.prop([fc.integer({ min: 1 })])('when the list is empty', async page => {
    const actual = await _.getRecentPrereviewsFromZenodo(page)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'https://zenodo.org/api/records/',
          query: {
            communities: 'prereview-reviews',
            page,
            size: '5',
            sort: 'mostrecent',
            subtype: 'peerreview',
          },
        },
        {
          body: RecordsC.encode({ hits: { total: 0, hits: [] } }),
          status: Status.OK,
        },
      ),
      getPreprintTitle: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.integer({ min: 1 }), fc.integer({ min: 400, max: 599 })])(
    'when the PREreviews cannot be loaded',
    async (page, status) => {
      const actual = await _.getRecentPrereviewsFromZenodo(page)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'https://zenodo.org/api/records/',
            query: {
              communities: 'prereview-reviews',
              page,
              size: '5',
              sort: 'mostrecent',
              subtype: 'peerreview',
            },
          },
          { status },
        ),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )

  test.prop([fc.integer({ max: 0 })])('when the page number is impossible', async page => {
    const actual = await _.getRecentPrereviewsFromZenodo(page)({
      fetch: fetchMock.sandbox(),
      getPreprintTitle: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})

describe('getPrereviewFromZenodo', () => {
  test.prop([fc.integer(), fc.preprint()])('when the PREreview can be loaded', async (id, preprint) => {
    const record: Record = {
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
        language: 'eng',
        license: {
          id: 'CC-BY-4.0',
        },
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            ..._.toExternalIdentifier(preprint.id),
            relation: 'reviews',
            resource_type: 'publication-preprint',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'Title',
      },
    }

    const getPreprint = jest.fn(_ => TE.right(preprint))

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock
        .sandbox()
        .getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        })
        .getOnce(
          { url: 'http://example.com/file', functionMatcher: (_, req) => req.cache === 'force-cache' },
          { body: 'Some text' },
        ),
      getPreprint,
    })()

    expect(actual).toStrictEqual(
      E.right({
        authors: [{ name: 'PREreviewer' }],
        doi: '10.5281/zenodo.1061864' as Doi,
        language: 'en',
        license: 'CC-BY-4.0',
        published: PlainDate.from('2022-07-05'),
        preprint: {
          id: preprint.id,
          title: preprint.title.text,
          language: preprint.title.language,
          url: preprint.url,
        },
        text: rawHtml('Some text'),
      }),
    )
    expect(getPreprint).toHaveBeenCalledWith(expect.objectContaining({ value: preprint.id.value }))
  })

  test.prop([fc.integer(), fc.preprint()])('revalidates if the PREreview is stale', async (id, preprint) => {
    const record: Record = {
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
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            ..._.toExternalIdentifier(preprint.id),
            relation: 'reviews',
            resource_type: 'publication-preprint',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'Title',
      },
    }

    const fetch = fetchMock
      .sandbox()
      .getOnce((url, { cache }) => url === `https://zenodo.org/api/records/${id}` && cache === 'force-cache', {
        body: RecordC.encode(record),
        headers: { 'X-Local-Cache-Status': 'stale' },
      })
      .getOnce((url, { cache }) => url === `https://zenodo.org/api/records/${id}` && cache === 'no-cache', {
        throws: new Error('Network error'),
      })
      .getOnce('http://example.com/file', { body: 'Some text' })

    const actual = await _.getPrereviewFromZenodo(id)({ fetch, getPreprint: () => TE.right(preprint) })()

    expect(actual).toStrictEqual(
      E.right({
        authors: [{ name: 'PREreviewer' }],
        doi: '10.5281/zenodo.1061864' as Doi,
        language: undefined,
        license: 'CC-BY-4.0',
        published: PlainDate.from('2022-07-05'),
        preprint: {
          id: preprint.id,
          title: preprint.title.text,
          language: preprint.title.language,
          url: preprint.url,
        },
        text: rawHtml('Some text'),
      }),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.integer()])('when the review is not found', async id => {
    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: undefined,
        status: Status.NotFound,
      }),
      getPreprint: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
  })

  test.prop([fc.integer(), fc.preprint(), fc.integer({ min: 400, max: 599 })])(
    'when the review text cannot be loaded',
    async (id, preprint, textStatus) => {
      const record: Record = {
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
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              ..._.toExternalIdentifier(preprint.id),
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'peerreview',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          })
          .getOnce('http://example.com/file', { status: textStatus }),
        getPreprint: () => TE.right(preprint),
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    },
  )

  test.prop([fc.integer()])('when the review cannot be loaded', async id => {
    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: undefined,
        status: Status.ServiceUnavailable,
      }),
      getPreprint: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })

  test.prop([fc.integer(), fc.preprintDoi(), fc.constantFrom('not-found' as const, 'unavailable' as const)])(
    'when the preprint cannot be loaded',
    async (id, preprintDoi, error) => {
      const record: Record = {
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
          publication_date: new Date('2022-07-05'),
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
            subtype: 'peerreview',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          })
          .getOnce('http://example.com/file', { body: 'Some text' }),
        getPreprint: () => TE.left(error),
      })()

      expect(actual).toStrictEqual(E.left(error))
    },
  )

  test.prop([fc.integer(), fc.preprintDoi()])('when the record is not in the community', async (id, preprintDoi) => {
    const record: Record = {
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
        publication_date: new Date('2022-07-05'),
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
          subtype: 'peerreview',
        },
        title: 'Title',
      },
    }

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprint: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
  })

  test.prop([
    fc.integer(),
    fc.preprintDoi(),
    fc.constantFrom(
      'annotationcollection' as const,
      'article' as const,
      'book' as const,
      'conferencepaper' as const,
      'datamanagementplan' as const,
      'deliverable' as const,
      'milestone' as const,
      'other' as const,
      'patent' as const,
      'preprint' as const,
      'proposal' as const,
      'report' as const,
      'section' as const,
      'softwaredocumentation' as const,
      'taxonomictreatment' as const,
      'technicalnote' as const,
      'thesis' as const,
      'workingpaper' as const,
    ),
  ])('when the record is not a peer review', async (id, preprintDoi, publicationType) => {
    const record: Record = {
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
        publication_date: new Date('2022-07-05'),
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
          subtype: publicationType,
        },
        title: 'Title',
      },
    }

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprint: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
  })

  test.prop([fc.integer(), fc.preprintDoi(), fc.string()])(
    'when the record does not have a CC-BY-4.0 license',
    async (id, preprintDoi, license) => {
      const record: Record = {
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
            id: license,
          },
          publication_date: new Date('2022-07-05'),
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
            subtype: 'peerreview',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprint: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.anything()))
    },
  )

  test.prop([fc.integer(), fc.oneof(fc.string(), fc.doi())])(
    'when the record does not review a preprint with a preprint DOI',
    async (id, identifier) => {
      const record: Record = {
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
          publication_date: new Date('2022-07-05'),
          related_identifiers: [
            {
              scheme: 'doi',
              identifier,
              relation: 'reviews',
              resource_type: 'publication-preprint',
            },
          ],
          resource_type: {
            type: 'publication',
            subtype: 'peerreview',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprint: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
    },
  )

  test.prop([
    fc.integer(),
    fc.preprint(),
    fc.nonEmptyArray(
      fc.record({
        links: fc.record({
          self: fc.url(),
        }),
        key: fc.string(),
        type: fc.string().filter(type => type !== 'html'),
        size: fc.integer(),
      }),
      { minLength: 1 },
    ),
  ])('when the record does not have a HTML file', async (id, preprint, files) => {
    const record: Record = {
      conceptdoi: '10.5072/zenodo.1061863' as Doi,
      conceptrecid: 1061863,
      files,
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
        publication_date: new Date('2022-07-05'),
        related_identifiers: [
          {
            ..._.toExternalIdentifier(preprint.id),
            relation: 'reviews',
            resource_type: 'publication-preprint',
          },
        ],
        resource_type: {
          type: 'publication',
          subtype: 'peerreview',
        },
        title: 'Title',
      },
    }

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprint: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })
})

describe('getPrereviewsFromZenodo', () => {
  test.prop([fc.preprintId()])('when the PREreviews can be loaded', async preprint => {
    const records: Records = {
      hits: {
        total: 1,
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
              language: 'eng',
              license: {
                id: 'CC-BY-4.0',
              },
              publication_date: new Date('2022-07-05'),
              resource_type: {
                type: 'publication',
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
        ],
      },
    }

    const actual = await _.getPrereviewsFromZenodo(preprint)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'https://zenodo.org/api/records/',
          query: {
            communities: 'prereview-reviews',
            q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
            sort: 'mostrecent',
            subtype: 'peerreview',
          },
        },
        {
          body: RecordsC.encode(records),
          status: Status.OK,
        },
      ),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: [{ name: 'PREreviewer' }],
          id: 1061864,
          language: 'en',
          text: rawHtml('Description'),
        },
      ]),
    )
  })

  test.prop([fc.preprintId()])('revalidates if the PREreviews are stale', async preprint => {
    const records: Records = {
      hits: {
        total: 1,
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
                subtype: 'peerreview',
              },
              title: 'Title',
            },
          },
        ],
      },
    }

    const fetch = fetchMock
      .sandbox()
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://zenodo.org/api/records/?${new URLSearchParams({
              communities: 'prereview-reviews',
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              size: '100',
              sort: 'mostrecent',
              subtype: 'peerreview',
            }).toString()}` && cache === 'force-cache',
        {
          body: RecordsC.encode(records),
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://zenodo.org/api/records/?${new URLSearchParams({
              communities: 'prereview-reviews',
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              size: '100',
              sort: 'mostrecent',
              subtype: 'peerreview',
            }).toString()}` && cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getPrereviewsFromZenodo(preprint)({ fetch })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: [{ name: 'PREreviewer' }],
          id: 1061864,
          language: undefined,
          text: rawHtml('Description'),
        },
      ]),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.preprintId(), fc.integer({ min: 400, max: 599 })])(
    'when the PREreviews cannot be loaded',
    async (preprint, status) => {
      const actual = await _.getPrereviewsFromZenodo(preprint)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'https://zenodo.org/api/records/',
            query: {
              communities: 'prereview-reviews',
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'mostrecent',
              subtype: 'peerreview',
            },
          },
          { status },
        ),
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
    },
  )
})

describe('createRecordOnZenodo', () => {
  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      persona: fc.constant('public'),
      preprint: fc.preprintTitle(),
      review: fc.html(),
      user: fc.user(),
    }),
    fc.string(),
    fc.doi(),
  ])('as a public persona', async (newPrereview, zenodoApiKey, reviewDoi) => {
    const unsubmittedDeposition: UnsubmittedDeposition = {
      id: 1,
      links: {
        bucket: new URL('http://example.com/bucket'),
        publish: new URL('http://example.com/publish'),
      },
      metadata: {
        creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
        description: 'Description',
        prereserve_doi: {
          doi: reviewDoi,
        },
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'peerreview',
      },
      state: 'unsubmitted',
      submitted: false,
    }
    const submittedDeposition: SubmittedDeposition = {
      id: 1,
      metadata: {
        creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
        description: 'Description',
        doi: reviewDoi,
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'peerreview',
      },
      state: 'done',
      submitted: true,
    }
    const actual = await _.createRecordOnZenodo(newPrereview)({
      fetch: fetchMock
        .sandbox()
        .postOnce(
          {
            url: 'https://zenodo.org/api/deposit/depositions',
            body: {
              metadata: {
                upload_type: 'publication',
                publication_type: 'peerreview',
                title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
                communities: [{ identifier: 'prereview-reviews' }],
                description: newPrereview.review.toString(),
                related_identifiers: [
                  {
                    ..._.toExternalIdentifier(newPrereview.preprint.id),
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
            url: 'http://example.com/bucket/review.html',
            headers: { 'Content-Type': 'text/html' },
            functionMatcher: (_, req) => req.body === newPrereview.review.toString(),
          },
          {
            status: Status.Created,
          },
        )
        .postOnce('http://example.com/publish', {
          body: SubmittedDepositionC.encode(submittedDeposition),
          status: Status.Accepted,
        }),
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
  })

  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      persona: fc.constant('pseudonym'),
      preprint: fc.preprintTitle(),
      review: fc.html(),
      user: fc.user(),
    }),
    fc.string(),
    fc.doi(),
  ])('as an pseudonym persona', async (newPrereview, zenodoApiKey, reviewDoi) => {
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
          doi: reviewDoi,
        },
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'peerreview',
      },
      state: 'unsubmitted',
      submitted: false,
    }
    const submittedDeposition: SubmittedDeposition = {
      id: 1,
      metadata: {
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: reviewDoi,
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'peerreview',
      },
      state: 'done',
      submitted: true,
    }
    const actual = await _.createRecordOnZenodo(newPrereview)({
      fetch: fetchMock
        .sandbox()
        .postOnce(
          {
            url: 'https://zenodo.org/api/deposit/depositions',
            body: {
              metadata: {
                upload_type: 'publication',
                publication_type: 'peerreview',
                title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                creators: [{ name: newPrereview.user.pseudonym }],
                communities: [{ identifier: 'prereview-reviews' }],
                description: newPrereview.review.toString(),
                related_identifiers: [
                  {
                    ..._.toExternalIdentifier(newPrereview.preprint.id),
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
            url: 'http://example.com/bucket/review.html',
            headers: { 'Content-Type': 'text/html' },
            functionMatcher: (_, req) => req.body === newPrereview.review.toString(),
          },
          {
            status: Status.Created,
          },
        )
        .postOnce('http://example.com/publish', {
          body: SubmittedDepositionC.encode(submittedDeposition),
          status: Status.Accepted,
        }),
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
  })

  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      persona: fc.constantFrom('public', 'pseudonym'),
      preprint: fc.preprintTitle(),
      review: fc.html(),
      user: fc.user(),
    }),
    fc.string(),
    fc.oneof(
      fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
      fc.error().map(error => Promise.reject(error)),
    ),
  ])('Zenodo is unavailable', async (newPrereview, zenodoApiKey, response) => {
    const actual = await _.createRecordOnZenodo(newPrereview)({
      fetch: () => response,
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })
})

describe('toExternalIdentifier', () => {
  test.prop([fc.preprintIdWithDoi()])('with a DOI preprint ID', preprintId => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'doi',
      identifier: preprintId.value,
    })
  })

  test.prop([fc.philsciPreprintId()])('with a PhilSci preprint ID', preprintId => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'url',
      identifier: `https://philsci-archive.pitt.edu/${preprintId.value}/`,
    })
  })
})
