import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'
import { Status } from 'hyper-ts'
import {
  Record,
  RecordC,
  Records,
  RecordsC,
  SubmittedDeposition,
  SubmittedDepositionC,
  UnsubmittedDeposition,
  UnsubmittedDepositionC,
} from 'zenodo-ts'
import { plainText, rawHtml } from '../src/html'
import { NewPrereview } from '../src/write-review'
import * as _ from '../src/zenodo'
import * as fc from './fc'

import PlainDate = Temporal.PlainDate

describe('getPrereviewFromZenodo', () => {
  test.prop([
    fc.integer(),
    fc.record({
      doi: fc.preprintDoi(),
      language: fc.languageCode(),
      title: fc.html(),
    }),
  ])('when the PREreview can be loaded', async (id, preprint) => {
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

    const getPreprintTitle = jest.fn(_ => TE.right(preprint))

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
      getPreprintTitle,
    })()

    expect(actual).toStrictEqual(
      E.right({
        authors: [{ name: 'PREreviewer' }],
        doi: '10.5281/zenodo.1061864' as Doi,
        license: 'CC-BY-4.0',
        postedDate: PlainDate.from('2022-07-05'),
        preprint,
        text: rawHtml('Some text'),
      }),
    )
    expect(getPreprintTitle).toHaveBeenCalledWith(preprint.doi)
  })

  test.prop([
    fc.integer(),
    fc.record({
      doi: fc.preprintDoi(),
      language: fc.languageCode(),
      title: fc.html(),
    }),
  ])('revalidates if the PREreview is stale', async (id, preprint) => {
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

    const actual = await _.getPrereviewFromZenodo(id)({ fetch, getPreprintTitle: () => TE.right(preprint) })()

    expect(actual).toStrictEqual(
      E.right({
        authors: [{ name: 'PREreviewer' }],
        doi: '10.5281/zenodo.1061864' as Doi,
        license: 'CC-BY-4.0',
        postedDate: PlainDate.from('2022-07-05'),
        preprint,
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
      getPreprintTitle: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
  })

  test.prop([
    fc.integer(),
    fc.record({
      doi: fc.preprintDoi(),
      language: fc.languageCode(),
      title: fc.html(),
    }),
    fc.integer({ min: 400, max: 599 }),
  ])('when the review text cannot be loaded', async (id, preprint, textStatus) => {
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

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock
        .sandbox()
        .getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        })
        .getOnce('http://example.com/file', { status: textStatus }),
      getPreprintTitle: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })

  test.prop([fc.integer()])('when the review cannot be loaded', async id => {
    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: undefined,
        status: Status.ServiceUnavailable,
      }),
      getPreprintTitle: () => () => Promise.reject('should not be called'),
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })

  test.prop([fc.integer(), fc.preprintDoi(), fc.anything()])(
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
            subtype: 'article',
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
        getPreprintTitle: () => TE.left(error),
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
          subtype: 'article',
        },
        title: 'Title',
      },
    }

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprintTitle: () => () => Promise.reject('should not be called'),
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
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
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
            subtype: 'article',
          },
          title: 'Title',
        },
      }

      const actual = await _.getPrereviewFromZenodo(id)({
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprintTitle: () => () => Promise.reject('should not be called'),
      })()

      expect(actual).toStrictEqual(E.left(expect.objectContaining({ status: Status.NotFound })))
    },
  )

  test.prop([
    fc.integer(),
    fc.record({
      doi: fc.preprintDoi(),
      language: fc.languageCode(),
      title: fc.html(),
    }),
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

    const actual = await _.getPrereviewFromZenodo(id)({
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprintTitle: () => TE.right(preprint),
    })()

    expect(actual).toStrictEqual(E.left(expect.anything()))
  })
})

describe('getPrereviewsFromZenodo', () => {
  test.prop([fc.preprintId()])('when the PREreviews can be loaded', async preprint => {
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

    const actual = await _.getPrereviewsFromZenodo(preprint)({
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
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: [{ name: 'PREreviewer' }],
          id: 1061864,
          text: rawHtml('Description'),
        },
      ]),
    )
  })

  test.prop([fc.preprintId()])('revalidates if the PREreviews are stale', async preprint => {
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

    const fetch = fetchMock
      .sandbox()
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://zenodo.org/api/records/?${new URLSearchParams({
              communities: 'prereview-reviews',
              q: `related.identifier:"${preprint.doi}"`,
              size: '100',
              sort: 'mostrecent',
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
              q: `related.identifier:"${preprint.doi}"`,
              size: '100',
              sort: 'mostrecent',
            }).toString()}` && cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getPrereviewsFromZenodo(preprint)({ fetch })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: [{ name: 'PREreviewer' }],
          id: 1061864,
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
              q: `related.identifier:"${preprint.doi}"`,
              sort: 'mostrecent',
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
      preprint: fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
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
        publication_type: 'article',
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
        publication_type: 'article',
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
                publication_type: 'article',
                title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                creators: [{ name: newPrereview.user.name, orcid: newPrereview.user.orcid }],
                communities: [{ identifier: 'prereview-reviews' }],
                description: newPrereview.review.toString(),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: newPrereview.preprint.doi,
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

    expect(actual).toStrictEqual(E.right(reviewDoi))
  })

  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      persona: fc.constant('pseudonym'),
      preprint: fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
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
        doi: reviewDoi,
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'article',
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
                publication_type: 'article',
                title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                creators: [{ name: newPrereview.user.pseudonym }],
                communities: [{ identifier: 'prereview-reviews' }],
                description: newPrereview.review.toString(),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: newPrereview.preprint.doi,
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

    expect(actual).toStrictEqual(E.right(reviewDoi))
  })

  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      persona: fc.constantFrom('public', 'pseudonym'),
      preprint: fc.record({
        doi: fc.preprintDoi(),
        language: fc.languageCode(),
        title: fc.html(),
      }),
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
