import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { SystemClock } from 'clock-ts'
import type { Doi } from 'doi-ts'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as A from 'fp-ts/lib/Array.js'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as O from 'fp-ts/lib/Option.js'
import * as RA from 'fp-ts/lib/ReadonlyArray.js'
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import { isString } from 'fp-ts/lib/string.js'
import { Status } from 'hyper-ts'
import { match } from 'ts-pattern'
import {
  type EmptyDeposition,
  EmptyDepositionC,
  type InProgressDeposition,
  InProgressDepositionC,
  type Record,
  RecordC,
  type Records,
  RecordsC,
  type SubmittedDeposition,
  SubmittedDepositionC,
  type UnsubmittedDeposition,
  UnsubmittedDepositionC,
} from 'zenodo-ts'
import { getClubName } from '../src/club-details.js'
import { plainText, rawHtml } from '../src/html.js'
import { reviewMatch } from '../src/routes.js'
import { iso6391To3 } from '../src/types/iso639.js'
import type { NewPrereview } from '../src/write-review/index.js'
import * as _ from '../src/zenodo.js'
import * as fc from './fc.js'
import { shouldNotBeCalled } from './should-not-be-called.js'

import PlainDate = Temporal.PlainDate

describe('getRecentPrereviewsFromZenodo', () => {
  test.prop([
    fc.integer({ min: 1 }),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
    fc.preprintTitle(),
    fc.preprintTitle(),
  ])('when the PREreviews can be loaded', async (page, field, language, query, preprint1, preprint2) => {
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              language: 'eng',
              license: { id: 'cc-by-4.0' },
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
              subjects: [
                {
                  term: 'Dynamics and Pathogenesis of Cholera Bacteria',
                  identifier: 'https://openalex.org/T11684',
                  scheme: 'url',
                },
                {
                  term: 'Endocrinology',
                  identifier: 'https://openalex.org/subfields/1310',
                  scheme: 'url',
                },
                {
                  term: 'Biochemistry, Genetics and Molecular Biology',
                  identifier: 'https://openalex.org/fields/13',
                  scheme: 'url',
                },
                {
                  term: 'Life Sciences',
                  identifier: 'https://openalex.org/domains/1',
                  scheme: 'url',
                },
                {
                  term: 'Genetic and Pathogenic Study of Plague Bacteria',
                  identifier: 'https://openalex.org/T12232',
                  scheme: 'url',
                },
                {
                  term: 'Genetics',
                  identifier: 'https://openalex.org/subfields/1311',
                  scheme: 'url',
                },
                {
                  term: 'Global Burden of Foodborne Pathogens',
                  identifier: 'https://openalex.org/T10486',
                  scheme: 'url',
                },
                {
                  term: 'Food Science',
                  identifier: 'https://openalex.org/subfields/1106',
                  scheme: 'url',
                },
                {
                  term: 'Agricultural and Biological Sciences',
                  identifier: 'https://openalex.org/fields/11',
                  scheme: 'url',
                },
              ],
              title: 'Title',
            },
          },
          {
            conceptdoi: '10.5072/zenodo.1065235' as Doi,
            conceptrecid: 1065235,
            files: [
              {
                links: {
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1065236,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'Josiah Carberry' }],
              description: 'Description',
              doi: '10.5281/zenodo.1065236' as Doi,
              language: 'eng',
              license: { id: 'cc-by-4.0' },
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

    const actual = await _.getRecentPrereviewsFromZenodo({ field, language, page, query })({
      clock: SystemClock,
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            q: `${
              field ? `custom_fields.legacy\\:subjects.identifier:"https://openalex.org/fields/${field}"` : ''
            }${field && language ? ' AND ' : ''}${language ? `language:"${iso6391To3(language)}"` : ''}${(field || language) && query ? ' AND ' : ''}${query ? `(title:(${query}) OR metadata.creators.person_or_org.name:(${query}))` : ''}`,
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
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(
      E.right({
        currentPage: page,
        field,
        language,
        query,
        recentPrereviews: [
          {
            club: undefined,
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: ['13', '11'],
            subfields: ['1310', '1311', '1106'],
            preprint: preprint1,
          },
          {
            club: undefined,
            id: 1065236,
            reviewers: ['Josiah Carberry'],
            published: new Temporal.PlainDate(2022, 7, 5),
            fields: [],
            subfields: [],
            preprint: preprint2,
          },
        ],
        totalPages: 1,
      }),
    )
  })

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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: { id: 'cc-by-4.0' },
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
              `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
                page: page.toString(),
                size: '5',
                sort: 'publication-desc',
                resource_type: 'publication::publication-peerreview',
                q: '',
              }).toString()}` && cache === 'force-cache',
          {
            body: RecordsC.encode(records),
            headers: { 'X-Local-Cache-Status': 'stale' },
          },
        )
        .getOnce(
          (url, { cache }) =>
            url ===
              `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
                page: page.toString(),
                size: '5',
                sort: 'publication-desc',
                resource_type: 'publication::publication-peerreview',
                q: '',
              }).toString()}` && cache === 'no-cache',
          { throws: new Error('Network error') },
        )

      const actual = await _.getRecentPrereviewsFromZenodo({ page })({
        clock: SystemClock,
        fetch,
        getPreprintTitle: () => TE.right(preprint),
        logger: () => IO.of(undefined),
        sleep: () => Promise.resolve(),
      })()

      expect(actual).toStrictEqual(
        E.right({
          currentPage: page,
          field: undefined,
          language: undefined,
          query: undefined,
          recentPrereviews: [
            {
              club: undefined,
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 5),
              fields: [],
              subfields: [],
              preprint,
            },
          ],
          totalPages: 1,
        }),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer({ min: 1 }), fc.preprintTitle(), fc.constantFrom('not-found', 'unavailable')])(
    'when a preprint cannot be loaded',
    async (page, preprint, error) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getRecentPrereviewsFromZenodo({ page })({
        clock: SystemClock,
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              page,
              size: '5',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right({
          currentPage: page,
          field: undefined,
          language: undefined,
          query: undefined,
          recentPrereviews: [
            {
              club: undefined,
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: [],
              subfields: [],
              preprint: preprint,
            },
          ],
          totalPages: 1,
        }),
      )
    },
  )

  test.prop([
    fc.integer({ min: 1 }),
    fc.constantFrom('not-found', 'unavailable'),
    fc.constantFrom('not-found', 'unavailable'),
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              language: 'eng',
              license: { id: 'cc-by-4.0' },
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1065236,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'Josiah Carberry' }],
              description: 'Description',
              doi: '10.5281/zenodo.1065236' as Doi,
              language: 'eng',
              license: { id: 'cc-by-4.0' },
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

    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
        query: {
          page,
          size: '5',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
        },
      },
      {
        body: RecordsC.encode(records),
        status: Status.OK,
      },
    )

    const actual = await _.getRecentPrereviewsFromZenodo({ page })({
      clock: SystemClock,
      fetch,
      getPreprintTitle: id =>
        match(id.value as unknown)
          .with('10.1101/2022.01.13.476201', () => TE.left(error1))
          .otherwise(() => TE.left(error2)),
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.integer({ min: 1 })])('when the list is empty', async page => {
    const actual = await _.getRecentPrereviewsFromZenodo({ page })({
      clock: SystemClock,
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
          },
        },
        {
          body: RecordsC.encode({ hits: { total: 0, hits: [] } }),
          status: Status.OK,
        },
      ),
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([fc.integer({ min: 1 }), fc.integer({ min: 400, max: 599 })])(
    'when the PREreviews cannot be loaded',
    async (page, status) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
          },
        },
        { status },
      )

      const actual = await _.getRecentPrereviewsFromZenodo({ page })({
        clock: SystemClock,
        fetch,
        getPreprintTitle: shouldNotBeCalled,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer({ max: 0 })])('when the page number is impossible', async page => {
    const actual = await _.getRecentPrereviewsFromZenodo({ page })({
      clock: SystemClock,
      fetch: shouldNotBeCalled,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })
})

describe('getPrereviewFromZenodo', () => {
  test.prop([
    fc.integer(),
    fc.preprint(),
    fc.option(fc.clubId(), { nil: undefined }),
    fc.boolean(),
    fc.boolean(),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
  ])(
    'when the PREreview can be loaded',
    async (id, preprint, club, requested, structured, [expectedAnonymous, otherAuthors]) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/review.html/content'),
            },
            key: 'review.html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          contributors: club
            ? [
                {
                  type: 'ResearchGroup',
                  name: getClubName(club),
                },
              ]
            : undefined,
          creators: [{ name: 'PREreviewer' }, ...otherAuthors],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          keywords: pipe(
            [requested ? 'Requested PREreview' : undefined, structured ? 'Structured PREreview' : undefined],
            A.filter(isString),
            A.matchW(() => undefined, identity),
          ),
          language: 'eng',
          license: { id: 'cc-by-4.0' },
          notes: '<p>Some note.</p>',
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
        clock: SystemClock,
        fetch: fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: Status.OK,
          })
          .getOnce(
            { url: 'http://example.com/review.html/content', functionMatcher: (_, req) => req.cache === 'force-cache' },
            { body: 'Some text' },
          ),
        getPreprint,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(
        E.right({
          addendum: rawHtml('<p>Some note.</p>'),
          authors: { named: [{ name: 'PREreviewer' }], anonymous: expectedAnonymous },
          club,
          doi: '10.5281/zenodo.1061864' as Doi,
          language: 'en',
          license: 'CC-BY-4.0',
          live: false,
          published: PlainDate.from('2022-07-05'),
          preprint: {
            id: preprint.id,
            title: preprint.title.text,
            language: preprint.title.language,
            url: preprint.url,
          },
          requested,
          structured,
          text: rawHtml('Some text'),
        }),
      )
      expect(getPreprint).toHaveBeenCalledWith(expect.objectContaining({ value: preprint.id.value }))
    },
  )

  test.prop([fc.integer(), fc.preprint()])('revalidates if the PREreview is stale', async (id, preprint) => {
    const record: Record = {
      conceptdoi: '10.5072/zenodo.1061863' as Doi,
      conceptrecid: 1061863,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: '10.5281/zenodo.1061864' as Doi,
        license: { id: 'cc-by-4.0' },
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
      .getOnce('http://example.com/review.html/content', { body: 'Some text' })

    const actual = await _.getPrereviewFromZenodo(id)({
      clock: SystemClock,
      fetch,
      getPreprint: () => TE.right(preprint),
      logger: () => IO.of(undefined),
      sleep: () => Promise.resolve(),
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(
      E.right({
        addendum: undefined,
        authors: { named: [{ name: 'PREreviewer' }], anonymous: 0 },
        club: undefined,
        doi: '10.5281/zenodo.1061864' as Doi,
        language: undefined,
        license: 'CC-BY-4.0',
        live: false,
        published: PlainDate.from('2022-07-05'),
        preprint: {
          id: preprint.id,
          title: preprint.title.text,
          language: preprint.title.language,
          url: preprint.url,
        },
        requested: false,
        structured: false,
        text: rawHtml('Some text'),
      }),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.integer()])('when the review was removed', async id => {
    const wasPrereviewRemoved = jest.fn<_.WasPrereviewRemovedEnv['wasPrereviewRemoved']>(_ => true)

    const actual = await _.getPrereviewFromZenodo(id)({
      clock: SystemClock,
      fetch: shouldNotBeCalled,
      getPreprint: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
      wasPrereviewRemoved,
    })()

    expect(actual).toStrictEqual(E.left('removed'))
  })

  test.prop([fc.integer(), fc.constantFrom(Status.NotFound, Status.Gone)])(
    'when the review is not found',
    async (id, status) => {
      const actual = await _.getPrereviewFromZenodo(id)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: undefined,
          status,
        }),
        getPreprint: shouldNotBeCalled,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([fc.integer(), fc.preprint(), fc.integer({ min: 400, max: 599 })])(
    'when the review text cannot be loaded',
    async (id, preprint, textStatus) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/review.html/content'),
            },
            key: 'review.html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: { id: 'cc-by-4.0' },
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
        .getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        })
        .getOnce('http://example.com/review.html/content', { status: textStatus })

      const actual = await _.getPrereviewFromZenodo(id)({
        clock: SystemClock,
        fetch,
        getPreprint: () => TE.right(preprint),
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer()])('when the review cannot be loaded', async id => {
    const fetch = fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
      body: undefined,
      status: Status.ServiceUnavailable,
    })

    const actual = await _.getPrereviewFromZenodo(id)({
      clock: SystemClock,
      fetch,
      getPreprint: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.integer(), fc.preprintDoi(), fc.constantFrom('not-found', 'unavailable')])(
    'when the preprint cannot be loaded',
    async (id, preprintDoi, error) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/review.html/content'),
            },
            key: 'review.html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: { id: 'cc-by-4.0' },
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

      const fetch = fetchMock
        .sandbox()
        .getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        })
        .getOnce('http://example.com/review.html/content', { body: 'Some text' })

      const actual = await _.getPrereviewFromZenodo(id)({
        clock: SystemClock,
        fetch,
        getPreprint: () => TE.left(error),
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left(error))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer(), fc.preprintDoi()])('when the record is not in the community', async (id, preprintDoi) => {
    const record: Record = {
      conceptdoi: '10.5072/zenodo.1061863' as Doi,
      conceptrecid: 1061863,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: '10.5281/zenodo.1061864' as Doi,
        license: { id: 'cc-by-4.0' },
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
      clock: SystemClock,
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprint: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
  })

  test.prop([
    fc.integer(),
    fc.preprintDoi(),
    fc.constantFrom(
      'annotationcollection',
      'article',
      'book',
      'conferencepaper',
      'datamanagementplan',
      'deliverable',
      'milestone',
      'other',
      'patent',
      'preprint',
      'proposal',
      'report',
      'section',
      'softwaredocumentation',
      'taxonomictreatment',
      'technicalnote',
      'thesis',
      'workingpaper',
    ),
  ])('when the record is not a peer review', async (id, preprintDoi, publicationType) => {
    const record: Record = {
      conceptdoi: '10.5072/zenodo.1061863' as Doi,
      conceptrecid: 1061863,
      files: [
        {
          links: {
            self: new URL('http://example.com/review.html/content'),
          },
          key: 'review.html',
          size: 58,
        },
      ],
      id,
      links: {
        latest: new URL('http://example.com/latest'),
        latest_html: new URL('http://example.com/latest_html'),
      },
      metadata: {
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: '10.5281/zenodo.1061864' as Doi,
        license: { id: 'cc-by-4.0' },
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
      clock: SystemClock,
      fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      }),
      getPreprint: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
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
              self: new URL('http://example.com/review.html/content'),
            },
            key: 'review.html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: { id: license },
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

      const fetch = fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: RecordC.encode(record),
        status: Status.OK,
      })

      const actual = await _.getPrereviewFromZenodo(id)({
        clock: SystemClock,
        fetch,
        getPreprint: shouldNotBeCalled,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer(), fc.oneof(fc.string(), fc.nonPreprintDoi())])(
    'when the record does not review a preprint with a preprint DOI',
    async (id, identifier) => {
      const record: Record = {
        conceptdoi: '10.5072/zenodo.1061863' as Doi,
        conceptrecid: 1061863,
        files: [
          {
            links: {
              self: new URL('http://example.com/review.html/content'),
            },
            key: 'review.html',
            size: 58,
          },
        ],
        id,
        links: {
          latest: new URL('http://example.com/latest'),
          latest_html: new URL('http://example.com/latest_html'),
        },
        metadata: {
          access_right: 'open',
          communities: [{ id: 'prereview-reviews' }],
          creators: [{ name: 'PREreviewer' }],
          description: 'Description',
          doi: '10.5281/zenodo.1061864' as Doi,
          license: { id: 'cc-by-4.0' },
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
        clock: SystemClock,
        fetch: fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: Status.OK,
        }),
        getPreprint: shouldNotBeCalled,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left('not-found'))
    },
  )

  test.prop([
    fc.integer(),
    fc.preprint(),
    fc.nonEmptyArray(
      fc.record({
        links: fc.record({
          self: fc.url(),
          download: fc.url(),
        }),
        key: fc.string(),
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
        access_right: 'open',
        communities: [{ id: 'prereview-reviews' }],
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: '10.5281/zenodo.1061864' as Doi,
        license: { id: 'cc-by-4.0' },
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

    const fetch = fetchMock.sandbox().getOnce(`https://zenodo.org/api/records/${id}`, {
      body: RecordC.encode(record),
      status: Status.OK,
    })

    const actual = await _.getPrereviewFromZenodo(id)({
      clock: SystemClock,
      fetch,
      getPreprint: () => TE.right(preprint),
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left('not-found'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForProfileFromZenodo', () => {
  describe('when the PREreviews can be loaded', () => {
    test.prop([fc.orcidProfileId(), fc.preprintTitle(), fc.preprintTitle()])(
      'with an ORCID iD',
      async (profile, preprint1, preprint2) => {
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
                      self: new URL('http://example.com/review.html/content'),
                    },
                    key: 'review.html',
                    size: 58,
                  },
                ],
                id: 1061864,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'PREreviewer' }],
                  description: 'Description',
                  doi: '10.5281/zenodo.1061864' as Doi,
                  language: 'eng',
                  license: { id: 'cc-by-4.0' },
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
                      self: new URL('http://example.com/review.html/content'),
                    },
                    key: 'review.html',
                    size: 58,
                  },
                ],
                id: 1065236,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'Josiah Carberry' }],
                  description: 'Description',
                  doi: '10.5281/zenodo.1065236' as Doi,
                  language: 'eng',
                  license: { id: 'cc-by-4.0' },
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

        const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
          fetch: fetchMock.sandbox().getOnce(
            {
              url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
              query: {
                q: `metadata.creators.person_or_org.identifiers.identifier:${profile.value}`,
                size: '100',
                sort: 'publication-desc',
                resource_type: 'publication::publication-peerreview',
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
          clock: SystemClock,
          logger: () => IO.of(undefined),
          sleep: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual(
          E.right([
            {
              club: undefined,
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: [],
              subfields: [],
              preprint: preprint1,
            },
            {
              club: undefined,
              id: 1065236,
              reviewers: ['Josiah Carberry'],
              published: new Temporal.PlainDate(2022, 7, 5),
              fields: [],
              subfields: [],
              preprint: preprint2,
            },
          ]),
        )
      },
    )

    test.prop([fc.pseudonymProfileId(), fc.preprintTitle(), fc.preprintTitle(), fc.clubId()])(
      'with a pseudonym',
      async (profile, preprint1, preprint2, club) => {
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
                      self: new URL('http://example.com/review.html/content'),
                    },
                    key: 'review.html',
                    size: 58,
                  },
                ],
                id: 1061864,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'PREreviewer' }],
                  description: 'Description',
                  doi: '10.5281/zenodo.1061864' as Doi,
                  language: 'eng',
                  license: { id: 'cc-by-4.0' },
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
                  subjects: [
                    {
                      term: 'Dynamics and Pathogenesis of Cholera Bacteria',
                      identifier: 'https://openalex.org/T11684',
                      scheme: 'url',
                    },
                    {
                      term: 'Endocrinology',
                      identifier: 'https://openalex.org/subfields/1310',
                      scheme: 'url',
                    },
                    {
                      term: 'Biochemistry, Genetics and Molecular Biology',
                      identifier: 'https://openalex.org/fields/13',
                      scheme: 'url',
                    },
                    {
                      term: 'Life Sciences',
                      identifier: 'https://openalex.org/domains/1',
                      scheme: 'url',
                    },
                    {
                      term: 'Genetic and Pathogenic Study of Plague Bacteria',
                      identifier: 'https://openalex.org/T12232',
                      scheme: 'url',
                    },
                    {
                      term: 'Genetics',
                      identifier: 'https://openalex.org/subfields/1311',
                      scheme: 'url',
                    },
                    {
                      term: 'Global Burden of Foodborne Pathogens',
                      identifier: 'https://openalex.org/T10486',
                      scheme: 'url',
                    },
                    {
                      term: 'Food Science',
                      identifier: 'https://openalex.org/subfields/1106',
                      scheme: 'url',
                    },
                    {
                      term: 'Agricultural and Biological Sciences',
                      identifier: 'https://openalex.org/fields/11',
                      scheme: 'url',
                    },
                  ],
                  title: 'Title',
                },
              },
              {
                conceptdoi: '10.5072/zenodo.1065235' as Doi,
                conceptrecid: 1065235,
                files: [
                  {
                    links: {
                      self: new URL('http://example.com/review.html/content'),
                    },
                    key: 'review.html',
                    size: 58,
                  },
                ],
                id: 1065236,
                links: {
                  latest: new URL('http://example.com/latest'),
                  latest_html: new URL('http://example.com/latest_html'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  contributors: [
                    {
                      type: 'ResearchGroup',
                      name: getClubName(club),
                    },
                  ],
                  creators: [{ name: 'Josiah Carberry' }],
                  description: 'Description',
                  doi: '10.5281/zenodo.1065236' as Doi,
                  language: 'eng',
                  license: { id: 'cc-by-4.0' },
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

        const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
          fetch: fetchMock.sandbox().getOnce(
            {
              url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
              query: {
                q: `metadata.creators.person_or_org.name:"${profile.value}"`,
                size: '100',
                sort: 'publication-desc',
                resource_type: 'publication::publication-peerreview',
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
          clock: SystemClock,
          logger: () => IO.of(undefined),
          sleep: shouldNotBeCalled,
        })()

        expect(actual).toStrictEqual(
          E.right([
            {
              club: undefined,
              id: 1061864,
              reviewers: ['PREreviewer'],
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: ['13', '11'],
              subfields: ['1310', '1311', '1106'],
              preprint: preprint1,
            },
            {
              club,
              id: 1065236,
              reviewers: ['Josiah Carberry'],
              published: new Temporal.PlainDate(2022, 7, 5),
              fields: [],
              subfields: [],
              preprint: preprint2,
            },
          ]),
        )
      },
    )
  })

  test.prop([fc.profileId(), fc.preprintTitle()])(
    'revalidates if the PREreviews are stale',
    async (profile, preprint) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: { id: 'cc-by-4.0' },
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
            url.startsWith('https://zenodo.org/api/communities/prereview-reviews/records?') && cache === 'force-cache',
          {
            body: RecordsC.encode(records),
            headers: { 'X-Local-Cache-Status': 'stale' },
          },
        )
        .getOnce(
          (url, { cache }) =>
            url.startsWith('https://zenodo.org/api/communities/prereview-reviews/records?') && cache === 'no-cache',
          {
            throws: new Error('Network error'),
          },
        )

      const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
        clock: SystemClock,
        fetch,
        getPreprintTitle: () => TE.right(preprint),
        logger: () => IO.of(undefined),
        sleep: () => Promise.resolve(),
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 5),
            fields: [],
            subfields: [],
            preprint,
          },
        ]),
      )
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.profileId(), fc.preprintTitle(), fc.constantFrom('not-found', 'unavailable')])(
    'when a preprint cannot be loaded',
    async (profile, preprint, error) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: [],
            subfields: [],
            preprint: preprint,
          },
        ]),
      )
    },
  )

  test.prop([
    fc.profileId(),
    fc.integer({
      min: 400,
      max: 599,
    }),
  ])('when the PREreviews cannot be loaded', async (profile, status) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
        query: {
          size: '100',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForUserFromZenodo', () => {
  test.prop([fc.user(), fc.preprintTitle(), fc.preprintTitle()])(
    'when the PREreviews can be loaded',
    async (user, preprint1, preprint2) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                subjects: [
                  {
                    term: 'Dynamics and Pathogenesis of Cholera Bacteria',
                    identifier: 'https://openalex.org/T11684',
                    scheme: 'url',
                  },
                  {
                    term: 'Endocrinology',
                    identifier: 'https://openalex.org/subfields/1310',
                    scheme: 'url',
                  },
                  {
                    term: 'Biochemistry, Genetics and Molecular Biology',
                    identifier: 'https://openalex.org/fields/13',
                    scheme: 'url',
                  },
                  {
                    term: 'Life Sciences',
                    identifier: 'https://openalex.org/domains/1',
                    scheme: 'url',
                  },
                  {
                    term: 'Genetic and Pathogenic Study of Plague Bacteria',
                    identifier: 'https://openalex.org/T12232',
                    scheme: 'url',
                  },
                  {
                    term: 'Genetics',
                    identifier: 'https://openalex.org/subfields/1311',
                    scheme: 'url',
                  },
                  {
                    term: 'Global Burden of Foodborne Pathogens',
                    identifier: 'https://openalex.org/T10486',
                    scheme: 'url',
                  },
                  {
                    term: 'Food Science',
                    identifier: 'https://openalex.org/subfields/1106',
                    scheme: 'url',
                  },
                  {
                    term: 'Agricultural and Biological Sciences',
                    identifier: 'https://openalex.org/fields/11',
                    scheme: 'url',
                  },
                ],
                title: 'Title',
              },
            },
            {
              conceptdoi: '10.5072/zenodo.1065235' as Doi,
              conceptrecid: 1065235,
              files: [
                {
                  links: {
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getPrereviewsForUserFromZenodo(user)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `metadata.creators.person_or_org.identifiers.identifier:${user.orcid} metadata.creators.person_or_org.name:"${user.pseudonym}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        clock: SystemClock,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: ['13', '11'],
            subfields: ['1310', '1311', '1106'],
            preprint: preprint1,
          },
          {
            club: undefined,
            id: 1065236,
            reviewers: ['Josiah Carberry'],
            published: new Temporal.PlainDate(2022, 7, 5),
            fields: [],
            subfields: [],
            preprint: preprint2,
          },
        ]),
      )
    },
  )

  test.prop([fc.user(), fc.preprintTitle()])('revalidates if the PREreviews are stale', async (user, preprint) => {
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              license: { id: 'cc-by-4.0' },
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
          url.startsWith('https://zenodo.org/api/communities/prereview-reviews/records?') && cache === 'force-cache',
        {
          body: RecordsC.encode(records),
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (url, { cache }) =>
          url.startsWith('https://zenodo.org/api/communities/prereview-reviews/records?') && cache === 'no-cache',
        {
          throws: new Error('Network error'),
        },
      )

    const actual = await _.getPrereviewsForUserFromZenodo(user)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: () => TE.right(preprint),
      logger: () => IO.of(undefined),
      sleep: () => Promise.resolve(),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club: undefined,
          id: 1061864,
          reviewers: ['PREreviewer'],
          fields: [],
          subfields: [],
          published: new Temporal.PlainDate(2022, 7, 5),
          preprint,
        },
      ]),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.user(), fc.preprintTitle(), fc.constantFrom('not-found', 'unavailable')])(
    'when a preprint cannot be loaded',
    async (user, preprint, error) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getPrereviewsForUserFromZenodo(user)({
        clock: SystemClock,
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: ['PREreviewer'],
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: [],
            subfields: [],
            preprint: preprint,
          },
        ]),
      )
    },
  )

  test.prop([
    fc.user(),
    fc.integer({
      min: 400,
      max: 599,
    }),
  ])('when the PREreviews cannot be loaded', async (user, status) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
        query: {
          size: '100',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForUserFromZenodo(user)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForClubFromZenodo', () => {
  test.prop([fc.clubId(), fc.preprintTitle(), fc.preprintTitle()])(
    'when the PREreviews can be loaded',
    async (club, preprint1, preprint2) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                contributors: [
                  {
                    name: getClubName(club),
                    type: 'ResearchGroup',
                  },
                ],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                subjects: [
                  {
                    term: 'Dynamics and Pathogenesis of Cholera Bacteria',
                    identifier: 'https://openalex.org/T11684',
                    scheme: 'url',
                  },
                  {
                    term: 'Endocrinology',
                    identifier: 'https://openalex.org/subfields/1310',
                    scheme: 'url',
                  },
                  {
                    term: 'Biochemistry, Genetics and Molecular Biology',
                    identifier: 'https://openalex.org/fields/13',
                    scheme: 'url',
                  },
                  {
                    term: 'Life Sciences',
                    identifier: 'https://openalex.org/domains/1',
                    scheme: 'url',
                  },
                  {
                    term: 'Genetic and Pathogenic Study of Plague Bacteria',
                    identifier: 'https://openalex.org/T12232',
                    scheme: 'url',
                  },
                  {
                    term: 'Genetics',
                    identifier: 'https://openalex.org/subfields/1311',
                    scheme: 'url',
                  },
                  {
                    term: 'Global Burden of Foodborne Pathogens',
                    identifier: 'https://openalex.org/T10486',
                    scheme: 'url',
                  },
                  {
                    term: 'Food Science',
                    identifier: 'https://openalex.org/subfields/1106',
                    scheme: 'url',
                  },
                  {
                    term: 'Agricultural and Biological Sciences',
                    identifier: 'https://openalex.org/fields/11',
                    scheme: 'url',
                  },
                ],
                title: 'Title',
              },
            },
            {
              conceptdoi: '10.5072/zenodo.1065235' as Doi,
              conceptrecid: 1065235,
              files: [
                {
                  links: {
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                contributors: [
                  {
                    name: getClubName(club),
                    type: 'ResearchGroup',
                  },
                ],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getPrereviewsForClubFromZenodo(club)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        clock: SystemClock,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club,
            id: 1061864,
            reviewers: ['PREreviewer'],
            fields: ['13', '11'],
            subfields: ['1310', '1311', '1106'],
            published: new Temporal.PlainDate(2022, 7, 4),
            preprint: preprint1,
          },
          {
            club,
            id: 1065236,
            reviewers: ['Josiah Carberry'],
            fields: [],
            subfields: [],
            published: new Temporal.PlainDate(2022, 7, 5),
            preprint: preprint2,
          },
        ]),
      )
    },
  )

  test.prop([fc.clubId()])('when there are no Prereviews', async club => {
    const actual = await _.getPrereviewsForClubFromZenodo(club)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
          },
        },
        {
          body: RecordsC.encode({ hits: { hits: [], total: 0 } }),
          status: Status.OK,
        },
      ),
      getPreprintTitle: shouldNotBeCalled,
      clock: SystemClock,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.right([]))
  })

  test.prop([fc.clubId(), fc.preprintTitle()])('revalidates if the PREreviews are stale', async (club, preprint) => {
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'PREreviewer' }],
              contributors: [
                {
                  name: getClubName(club),
                  type: 'ResearchGroup',
                },
              ],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              license: { id: 'cc-by-4.0' },
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
            `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
              q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            }).toString()}` && cache === 'force-cache',
        {
          body: RecordsC.encode(records),
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
              q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            }).toString()}` && cache === 'no-cache',
        { throws: new Error('Network error') },
      )

    const actual = await _.getPrereviewsForClubFromZenodo(club)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: () => TE.right(preprint),
      logger: () => IO.of(undefined),
      sleep: () => Promise.resolve(),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club,
          id: 1061864,
          reviewers: ['PREreviewer'],
          fields: [],
          subfields: [],
          published: new Temporal.PlainDate(2022, 7, 5),
          preprint,
        },
      ]),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.clubId(),
    fc.integer({
      min: 400,
      max: 599,
    }),
  ])('when the PREreviews cannot be loaded', async (club, status) => {
    const fetch = fetchMock.sandbox().getOnce(
      {
        url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
        query: {
          q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
          size: '100',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForClubFromZenodo(club)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.clubId(), fc.preprintTitle(), fc.constantFrom('not-found', 'unavailable')])(
    'when a preprint cannot be loaded',
    async (club, preprint, error) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                contributors: [
                  {
                    name: getClubName(club),
                    type: 'ResearchGroup',
                  },
                ],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1065236,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'Josiah Carberry' }],
                contributors: [
                  {
                    name: getClubName(club),
                    type: 'ResearchGroup',
                  },
                ],
                description: 'Description',
                doi: '10.5281/zenodo.1065236' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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

      const actual = await _.getPrereviewsForClubFromZenodo(club)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
            .with('10.1101/2022.02.14.480364', () => TE.left(error))
            .otherwise(() => TE.left('not-found')),
        clock: SystemClock,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club,
            id: 1061864,
            reviewers: ['PREreviewer'],
            fields: [],
            subfields: [],
            published: new Temporal.PlainDate(2022, 7, 4),
            preprint: preprint,
          },
        ]),
      )
    },
  )

  test.prop([fc.clubId(), fc.preprintTitle(), fc.preprintTitle()])(
    'when a review is not part of the club',
    async (club, preprint1, preprint2) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                language: 'eng',
                license: { id: 'cc-by-4.0' },
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
          ],
        },
      }

      const actual = await _.getPrereviewsForClubFromZenodo(club)({
        fetch: fetchMock.sandbox().getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `metadata.contributors.person_or_org.name:"${getClubName(club)}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
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
        clock: SystemClock,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.right([]))
    },
  )
})

describe('getPrereviewsForPreprintFromZenodo', () => {
  test.prop([
    fc.preprintId(),
    fc.option(fc.clubId(), { nil: undefined }),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
  ])('when the PREreviews can be loaded', async (preprint, club, [expectedAnonymous, otherAuthors]) => {
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              contributors: club
                ? [
                    {
                      type: 'ResearchGroup',
                      name: getClubName(club),
                    },
                  ]
                : undefined,
              creators: [{ name: 'PREreviewer' }, ...otherAuthors],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              language: 'eng',
              license: { id: 'cc-by-4.0' },
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

    const actual = await _.getPrereviewsForPreprintFromZenodo(preprint)({
      clock: SystemClock,
      fetch: fetchMock
        .sandbox()
        .getOnce(
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            },
          },
          {
            body: RecordsC.encode(records),
            status: Status.OK,
          },
        )
        .getOnce('http://example.com/review.html/content', { body: 'Some text' }),
      logger: () => IO.of(undefined),
      sleep: shouldNotBeCalled,
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: { named: [{ name: 'PREreviewer' }], anonymous: expectedAnonymous },
          club,
          id: 1061864,
          language: 'en',
          text: rawHtml('Some text'),
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
                  self: new URL('http://example.com/review.html/content'),
                },
                key: 'review.html',
                size: 58,
              },
            ],
            id: 1061864,
            links: {
              latest: new URL('http://example.com/latest'),
              latest_html: new URL('http://example.com/latest_html'),
            },
            metadata: {
              access_right: 'open',
              communities: [{ id: 'prereview-reviews' }],
              creators: [{ name: 'PREreviewer' }],
              description: 'Description',
              doi: '10.5281/zenodo.1061864' as Doi,
              license: { id: 'cc-by-4.0' },
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
            `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            }).toString()}` && cache === 'force-cache',
        {
          body: RecordsC.encode(records),
          headers: { 'X-Local-Cache-Status': 'stale' },
        },
      )
      .getOnce(
        (url, { cache }) =>
          url ===
            `https://zenodo.org/api/communities/prereview-reviews/records?${new URLSearchParams({
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            }).toString()}` && cache === 'no-cache',
        { throws: new Error('Network error') },
      )
      .getOnce('http://example.com/review.html/content', { body: 'Some text' })

    const actual = await _.getPrereviewsForPreprintFromZenodo(preprint)({
      clock: SystemClock,
      fetch,
      logger: () => IO.of(undefined),
      sleep: () => Promise.resolve(),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          authors: { named: [{ name: 'PREreviewer' }], anonymous: 0 },
          club: undefined,
          id: 1061864,
          language: undefined,
          text: rawHtml('Some text'),
        },
      ]),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.preprintId(), fc.integer({ min: 400, max: 599 })])(
    'when the PREreviews cannot be loaded',
    async (preprint, status) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
          },
        },
        { status },
      )

      const actual = await _.getPrereviewsForPreprintFromZenodo(preprint)({
        clock: SystemClock,
        fetch,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.preprintId(), fc.integer({ min: 400, max: 599 })])(
    'when the review text cannot be loaded',
    async (preprint, textStatus) => {
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
                    self: new URL('http://example.com/review.html/content'),
                  },
                  key: 'review.html',
                  size: 58,
                },
              ],
              id: 1061864,
              links: {
                latest: new URL('http://example.com/latest'),
                latest_html: new URL('http://example.com/latest_html'),
              },
              metadata: {
                access_right: 'open',
                communities: [{ id: 'prereview-reviews' }],
                creators: [{ name: 'PREreviewer' }],
                description: 'Description',
                doi: '10.5281/zenodo.1061864' as Doi,
                license: { id: 'cc-by-4.0' },
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
          {
            url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
            query: {
              q: `related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
            },
          },
          {
            body: RecordsC.encode(records),
            status: Status.OK,
          },
        )
        .getOnce('http://example.com/review.html/content', { status: textStatus })

      const actual = await _.getPrereviewsForPreprintFromZenodo(preprint)({
        clock: SystemClock,
        fetch,
        logger: () => IO.of(undefined),
        sleep: shouldNotBeCalled,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )
})

describe('addAuthorToRecordOnZenodo', () => {
  describe('when the deposition is submitted', () => {
    test.prop([fc.string(), fc.integer({ min: 1 }), fc.user(), fc.user(), fc.doi()])(
      'with a public name',
      async (zenodoApiKey, id, user, creator, doi) => {
        const submittedDeposition: SubmittedDeposition = {
          id: 1,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: SubmittedDepositionC.encode(submittedDeposition),
          })
          .postOnce('http://example.com/edit', {
            body: InProgressDepositionC.encode(inProgressDeposition),
            status: Status.Created,
          })
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    { name: creator.name, orcid: creator.orcid },
                    { name: user.name, orcid: user.orcid },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
            },
            {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: Status.OK,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          })

        const actual = await _.addAuthorToRecordOnZenodo(id, user, 'public')({ fetch, zenodoApiKey })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.integer({ min: 1 }), fc.user(), fc.user(), fc.doi()])(
      'with a pseudonym',
      async (zenodoApiKey, id, user, creator, doi) => {
        const submittedDeposition: SubmittedDeposition = {
          id: 1,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: SubmittedDepositionC.encode(submittedDeposition),
          })
          .postOnce('http://example.com/edit', {
            body: InProgressDepositionC.encode(inProgressDeposition),
            status: Status.Created,
          })
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [{ name: creator.name, orcid: creator.orcid }, { name: user.pseudonym }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
            },
            {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: Status.OK,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          })

        const actual = await _.addAuthorToRecordOnZenodo(id, user, 'pseudonym')({ fetch, zenodoApiKey })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.integer({ min: 1 }), fc.user(), fc.user(), fc.doi(), fc.integer({ min: 3 })])(
      'when there are multiple other authors',
      async (zenodoApiKey, id, user, creator, doi, otherAuthors) => {
        const submittedDeposition: SubmittedDeposition = {
          id: 1,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: `${otherAuthors} other authors` }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: `${otherAuthors} other authors` }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: SubmittedDepositionC.encode(submittedDeposition),
          })
          .postOnce('http://example.com/edit', {
            body: InProgressDepositionC.encode(inProgressDeposition),
            status: Status.Created,
          })
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    { name: creator.name, orcid: creator.orcid },
                    { name: user.name, orcid: user.orcid },
                    { name: `${otherAuthors - 1} other authors` },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
            },
            {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: Status.OK,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          })

        const actual = await _.addAuthorToRecordOnZenodo(id, user, 'public')({ fetch, zenodoApiKey })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.integer({ min: 1 }), fc.user(), fc.user(), fc.doi()])(
      'when there are 2 other authors',
      async (zenodoApiKey, id, user, creator, doi) => {
        const submittedDeposition: SubmittedDeposition = {
          id: 1,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: '2 other authors' }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: '2 other authors' }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: SubmittedDepositionC.encode(submittedDeposition),
          })
          .postOnce('http://example.com/edit', {
            body: InProgressDepositionC.encode(inProgressDeposition),
            status: Status.Created,
          })
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    { name: creator.name, orcid: creator.orcid },
                    { name: user.name, orcid: user.orcid },
                    { name: '1 other author' },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
            },
            {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: Status.OK,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          })

        const actual = await _.addAuthorToRecordOnZenodo(id, user, 'public')({ fetch, zenodoApiKey })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )

    test.prop([fc.string(), fc.integer({ min: 1 }), fc.user(), fc.user(), fc.doi()])(
      'when there is 1 other author',
      async (zenodoApiKey, id, user, creator, doi) => {
        const submittedDeposition: SubmittedDeposition = {
          id: 1,
          links: {
            edit: new URL('http://example.com/edit'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: '1 other authors' }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            publication_type: 'peerreview',
          },
          state: 'done',
          submitted: true,
        }
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [{ name: creator.name, orcid: creator.orcid }, { name: '1 other authors' }],
            description: 'Description',
            doi,
            title: 'Title',
            upload_type: 'publication',
            prereserve_doi: { doi },
            publication_type: 'peerreview',
          },
          state: 'inprogress',
          submitted: true,
        }

        const fetch = fetchMock
          .sandbox()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: SubmittedDepositionC.encode(submittedDeposition),
          })
          .postOnce('http://example.com/edit', {
            body: InProgressDepositionC.encode(inProgressDeposition),
            status: Status.Created,
          })
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    { name: creator.name, orcid: creator.orcid },
                    { name: user.name, orcid: user.orcid },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
            },
            {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: Status.OK,
            },
          )
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          })

        const actual = await _.addAuthorToRecordOnZenodo(id, user, 'public')({ fetch, zenodoApiKey })()

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.done()).toBeTruthy()
      },
    )
  })

  test.prop([
    fc.string(),
    fc.integer({ min: 1 }),
    fc.user(),
    fc.constantFrom('public', 'pseudonym'),
    fc.user(),
    fc.doi(),
  ])('when the deposition is not submitted', async (zenodoApiKey, id, user, persona, creator, doi) => {
    const inProgressDeposition: InProgressDeposition = {
      id: 1,
      links: {
        publish: new URL('http://example.com/publish'),
        self: new URL('http://example.com/self'),
      },
      metadata: {
        creators: [{ name: creator.name, orcid: creator.orcid }],
        description: 'Description',
        doi,
        title: 'Title',
        upload_type: 'publication',
        prereserve_doi: { doi },
        publication_type: 'peerreview',
      },
      state: 'inprogress',
      submitted: true,
    }

    const fetch = fetchMock.sandbox().getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
      body: InProgressDepositionC.encode(inProgressDeposition),
    })

    const actual = await _.addAuthorToRecordOnZenodo(id, user, persona)({ fetch, zenodoApiKey })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.string(),
    fc.integer({ min: 1 }),
    fc.user(),
    fc.constantFrom('public', 'pseudonym'),
    fc.oneof(
      fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
      fc.error().map(error => Promise.reject(error)),
    ),
  ])('Zenodo is unavailable', async (zenodoApiKey, id, user, persona, response) => {
    const actual = await _.addAuthorToRecordOnZenodo(
      id,
      user,
      persona,
    )({
      fetch: () => response,
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})
describe('createRecordOnZenodo', () => {
  describe('as a public persona', () => {
    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
        persona: fc.constant('public'),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        structured: fc.constant(false),
        user: fc.user(),
      }),
      fc.array(fc.record({ id: fc.url(), name: fc.string() })),
      fc.boolean(),
      fc.string(),
      fc.origin(),
      fc.doi(),
    ])('with a PREreview', async (newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi) => {
      const getPreprintSubjects = jest.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(_ => T.of(subjects))
      const isReviewRequested = jest.fn<_.IsReviewRequestedEnv['isReviewRequested']>(_ => T.of(requested))

      const emptyDeposition: EmptyDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          prereserve_doi: {
            doi: reviewDoi,
          },
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
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
        links: {
          edit: new URL('http://example.com/edit'),
        },
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
      const reviewUrl = `${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id: 1 })}`

      const actual = await _.createRecordOnZenodo(newPrereview)({
        clock: SystemClock,
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {},
            },
            {
              body: EmptyDepositionC.encode(emptyDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                  title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [
                    {
                      name: newPrereview.user.name,
                      orcid: newPrereview.user.orcid,
                    },
                    ...match(newPrereview.otherAuthors.length)
                      .with(0, () => [])
                      .with(1, () => [{ name: '1 other author' }])
                      .otherwise(number => [{ name: `${number} other authors` }]),
                  ],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                  ...(O.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(RA.isNonEmpty(subjects)
                    ? { subjects: subjects.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })) }
                    : {}),
                  related_identifiers: [
                    {
                      ..._.toExternalIdentifier(newPrereview.preprint.id),
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                    {
                      identifier: reviewUrl,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.OK,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'application/octet-stream' },
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
        getPreprintSubjects,
        isReviewRequested,
        logger: () => IO.of(undefined),
        publicUrl,
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
      expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
      expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
    })

    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
        persona: fc.constant('public'),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        structured: fc.constant(true),
        user: fc.user(),
      }),
      fc.array(fc.record({ id: fc.url(), name: fc.string() })),
      fc.boolean(),
      fc.string(),
      fc.origin(),
      fc.doi(),
    ])('with a Structured PREreview', async (newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi) => {
      const getPreprintSubjects = jest.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(_ => T.of(subjects))
      const isReviewRequested = jest.fn<_.IsReviewRequestedEnv['isReviewRequested']>(_ => T.of(requested))

      const emptyDeposition: EmptyDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          prereserve_doi: {
            doi: reviewDoi,
          },
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
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
        links: {
          edit: new URL('http://example.com/edit'),
        },
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
      const reviewUrl = `${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id: 1 })}`

      const actual = await _.createRecordOnZenodo(newPrereview)({
        clock: SystemClock,
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {},
            },
            {
              body: EmptyDepositionC.encode(emptyDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                  title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [
                    {
                      name: newPrereview.user.name,
                      orcid: newPrereview.user.orcid,
                    },
                    ...match(newPrereview.otherAuthors.length)
                      .with(0, () => [])
                      .with(1, () => [{ name: '1 other author' }])
                      .otherwise(number => [{ name: `${number} other authors` }]),
                  ],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(isString),
                  ...(O.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(RA.isNonEmpty(subjects)
                    ? { subjects: subjects.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })) }
                    : {}),
                  related_identifiers: [
                    {
                      ..._.toExternalIdentifier(newPrereview.preprint.id),
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                    {
                      identifier: reviewUrl,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.OK,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'application/octet-stream' },
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
        getPreprintSubjects,
        isReviewRequested,
        logger: () => IO.of(undefined),
        publicUrl,
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
      expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
      expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
    })
  })

  describe('as an pseudonym persona', () => {
    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
        persona: fc.constant('pseudonym'),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        structured: fc.constant(false),
        user: fc.user(),
      }),
      fc.array(fc.record({ id: fc.url(), name: fc.string() })),
      fc.boolean(),
      fc.string(),
      fc.origin(),
      fc.doi(),
    ])('with a PREreview', async (newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi) => {
      const emptyDeposition: EmptyDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          prereserve_doi: {
            doi: reviewDoi,
          },
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
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
        links: {
          edit: new URL('http://example.com/edit'),
        },
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
      const reviewUrl = `${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id: 1 })}`

      const actual = await _.createRecordOnZenodo(newPrereview)({
        clock: SystemClock,
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {},
            },
            {
              body: EmptyDepositionC.encode(emptyDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                  title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [
                    { name: newPrereview.user.pseudonym },
                    ...match(newPrereview.otherAuthors.length)
                      .with(0, () => [])
                      .with(1, () => [{ name: '1 other author' }])
                      .otherwise(number => [{ name: `${number} other authors` }]),
                  ],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                  ...(O.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(RA.isNonEmpty(subjects)
                    ? { subjects: subjects.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })) }
                    : {}),
                  related_identifiers: [
                    {
                      ..._.toExternalIdentifier(newPrereview.preprint.id),
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                    {
                      identifier: reviewUrl,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.OK,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'application/octet-stream' },
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
        getPreprintSubjects: () => T.of(subjects),
        isReviewRequested: () => T.of(requested),
        logger: () => IO.of(undefined),
        publicUrl,
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
    })

    test.prop([
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
        persona: fc.constant('pseudonym'),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        structured: fc.constant(true),
        user: fc.user(),
      }),
      fc.array(fc.record({ id: fc.url(), name: fc.string() })),
      fc.boolean(),
      fc.string(),
      fc.origin(),
      fc.doi(),
    ])('with a Structured PREreview', async (newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi) => {
      const emptyDeposition: EmptyDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          prereserve_doi: {
            doi: reviewDoi,
          },
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
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
        links: {
          edit: new URL('http://example.com/edit'),
        },
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
      const reviewUrl = `${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id: 1 })}`

      const actual = await _.createRecordOnZenodo(newPrereview)({
        clock: SystemClock,
        fetch: fetchMock
          .sandbox()
          .postOnce(
            {
              url: 'https://zenodo.org/api/deposit/depositions',
              body: {},
            },
            {
              body: EmptyDepositionC.encode(emptyDeposition),
              status: Status.Created,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/self',
              body: {
                metadata: {
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                  title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                  creators: [
                    { name: newPrereview.user.pseudonym },
                    ...match(newPrereview.otherAuthors.length)
                      .with(0, () => [])
                      .with(1, () => [{ name: '1 other author' }])
                      .otherwise(number => [{ name: `${number} other authors` }]),
                  ],
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(isString),
                  ...(O.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(RA.isNonEmpty(subjects)
                    ? { subjects: subjects.map(({ id, name }) => ({ term: name, identifier: id.href, scheme: 'url' })) }
                    : {}),
                  related_identifiers: [
                    {
                      ..._.toExternalIdentifier(newPrereview.preprint.id),
                      relation: 'reviews',
                      resource_type: 'publication-preprint',
                    },
                    {
                      identifier: reviewUrl,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                },
              },
            },
            {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: Status.OK,
            },
          )
          .putOnce(
            {
              url: 'http://example.com/bucket/review.html',
              headers: { 'Content-Type': 'application/octet-stream' },
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
        getPreprintSubjects: () => T.of(subjects),
        isReviewRequested: () => T.of(requested),
        logger: () => IO.of(undefined),
        publicUrl,
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
    })
  })

  test.prop([
    fc.record<NewPrereview>({
      conduct: fc.constant('yes'),
      otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
      persona: fc.constantFrom('public', 'pseudonym'),
      preprint: fc.preprintTitle(),
      review: fc.html(),
      language: fc.maybe(fc.languageCode()),
      structured: fc.boolean(),
      user: fc.user(),
    }),
    fc.array(fc.record({ id: fc.url(), name: fc.string() })),
    fc.boolean(),
    fc.string(),
    fc.origin(),
    fc.oneof(
      fc.fetchResponse({ status: fc.integer({ min: 400 }) }).map(response => Promise.resolve(response)),
      fc.error().map(error => Promise.reject(error)),
    ),
  ])('Zenodo is unavailable', async (newPrereview, subjects, requested, zenodoApiKey, publicUrl, response) => {
    const actual = await _.createRecordOnZenodo(newPrereview)({
      clock: SystemClock,
      fetch: () => response,
      getPreprintSubjects: () => T.of(subjects),
      isReviewRequested: () => T.of(requested),
      logger: () => IO.of(undefined),
      publicUrl,
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
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
