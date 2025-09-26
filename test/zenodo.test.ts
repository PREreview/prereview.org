import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { SystemClock } from 'clock-ts'
import { Doi } from 'doi-ts'
import { Array, Option, pipe, String } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
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
import { getClubName } from '../src/club-details.ts'
import { plainText, rawHtml } from '../src/html.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../src/Preprints/index.ts'
import * as Prereview from '../src/Prereview.ts'
import { reviewMatch } from '../src/routes.ts'
import { iso6391To3 } from '../src/types/iso639.ts'
import type { NewPrereview } from '../src/write-review/index.ts'
import * as _ from '../src/zenodo.ts'
import * as fc from './fc.ts'
import { shouldNotBeCalled } from './should-not-be-called.ts'

describe('getRecentPrereviewsFromZenodo', () => {
  test.prop([
    fc.integer({ min: 1 }),
    fc.option(fc.fieldId(), { nil: undefined }),
    fc.option(fc.languageCode(), { nil: undefined }),
    fc.option(fc.nonEmptyString(), { nil: undefined }),
    fc.preprintTitle(),
    fc.preprintTitle(),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
  ])(
    'when the PREreviews can be loaded',
    async (page, field, language, query, preprint1, preprint2, [expectedAnonymous, otherAuthors]) => {
      const records: Records = {
        hits: {
          total: 2,
          hits: [
            {
              conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                creators: [{ name: 'PREreviewer' }, ...otherAuthors],
                description: 'Description',
                doi: Doi('10.5281/zenodo.1061864'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-04'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.01.13.476201'),
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
              conceptdoi: Doi('10.5072/zenodo.1065235'),
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
                doi: Doi('10.5281/zenodo.1065236'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-05'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.02.14.480364'),
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
              access_status: 'open',
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint"${
                field ? ` AND custom_fields.legacy\\:subjects.identifier:"https://openalex.org/fields/${field}"` : ''
              }${language ? ` AND language:"${iso6391To3(language)}"` : ''}${query ? ` AND (title:"${query}"~5 OR metadata.creators.person_or_org.name:"${query}"~5)` : ''}`,
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
            .otherwise(() => TE.left(new PreprintIsNotFound({}))),
        logger: () => IO.of(undefined),
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
              reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: ['13', '11'],
              subfields: ['1310', '1311', '1106'],
              preprint: preprint1,
            },
            {
              club: undefined,
              id: 1065236,
              reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
              published: new Temporal.PlainDate(2022, 7, 5),
              fields: [],
              subfields: [],
              preprint: preprint2,
            },
          ],
          totalPages: 1,
        }),
      )
    },
  )

  test.prop([
    fc.integer({ min: 1 }),
    fc.preprintTitle(),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when a preprint cannot be loaded', async (page, preprint, error) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            q: 'metadata.related_identifiers.resource_type.id:"publication-preprint"',
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
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
            reviewers: { named: ['PREreviewer'], anonymous: 0 },
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: [],
            subfields: [],
            preprint,
          },
        ],
        totalPages: 1,
      }),
    )
  })

  test.prop([
    fc.integer({ min: 1 }),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when none of the preprints can be loaded', async (page, error1, error2) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
          q: 'metadata.related_identifiers.resource_type.id:"publication-preprint"',
          page,
          size: '5',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
          access_status: 'open',
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
            q: 'metadata.related_identifiers.resource_type.id:"publication-preprint"',
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
        },
        {
          body: RecordsC.encode({ hits: { total: 0, hits: [] } }),
          status: Status.OK,
        },
      ),
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
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
            q: 'metadata.related_identifiers.resource_type.id:"publication-preprint"',
            page,
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
        },
        { status },
      )

      const actual = await _.getRecentPrereviewsFromZenodo({ page })({
        clock: SystemClock,
        fetch,
        getPreprintTitle: shouldNotBeCalled,
        logger: () => IO.of(undefined),
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
    fc.boolean(),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
    fc.constantFrom(['CC0-1.0', 'cc-zero'], ['CC-BY-4.0', 'cc-by-4.0']),
  ])(
    'when the PREreview can be loaded',
    async (
      id,
      preprint,
      club,
      requested,
      structured,
      live,
      [expectedAnonymous, otherAuthors],
      [expectedLicense, license],
    ) => {
      const record: Record = {
        conceptdoi: Doi('10.5072/zenodo.1061863'),
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
          doi: Doi('10.5281/zenodo.1061864'),
          keywords: pipe(
            [
              requested ? 'Requested PREreview' : undefined,
              structured ? 'Structured PREreview' : undefined,
              live ? 'Live Review' : undefined,
            ],
            Array.filter(String.isString),
            Array.match({ onEmpty: () => undefined, onNonEmpty: values => [...values] }),
          ),
          language: 'eng',
          license: { id: license },
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
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(
        E.right(
          new Prereview.Prereview({
            addendum: rawHtml('<p>Some note.</p>'),
            authors: { named: [{ name: 'PREreviewer' }], anonymous: expectedAnonymous },
            club,
            doi: Doi('10.5281/zenodo.1061864'),
            id,
            language: 'en',
            license: expectedLicense,
            live,
            published: Temporal.PlainDate.from('2022-07-05'),
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
        ),
      )
      expect(getPreprint).toHaveBeenCalledWith(expect.objectContaining({ value: preprint.id.value }))
    },
  )

  test.prop([fc.integer()])('when the review was removed', async id => {
    const wasPrereviewRemoved = jest.fn<_.WasPrereviewRemovedEnv['wasPrereviewRemoved']>(_ => true)

    const actual = await _.getPrereviewFromZenodo(id)({
      clock: SystemClock,
      fetch: shouldNotBeCalled,
      getPreprint: shouldNotBeCalled,
      logger: () => IO.of(undefined),
      wasPrereviewRemoved,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewWasRemoved()))
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
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
    },
  )

  test.prop([fc.integer(), fc.preprint(), fc.integer({ min: 400, max: 599 })])(
    'when the review text cannot be loaded',
    async (id, preprint, textStatus) => {
      const record: Record = {
        conceptdoi: Doi('10.5072/zenodo.1061863'),
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
          doi: Doi('10.5281/zenodo.1061864'),
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
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsUnavailable()))
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsUnavailable()))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.integer(),
    fc.preprintDoi(),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when the preprint cannot be loaded', async (id, preprintDoi, error) => {
    const record: Record = {
      conceptdoi: Doi('10.5072/zenodo.1061863'),
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
        doi: Doi('10.5281/zenodo.1061864'),
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(
      E.left(
        error._tag === 'PreprintIsNotFound'
          ? new Prereview.PrereviewIsNotFound()
          : new Prereview.PrereviewIsUnavailable(),
      ),
    )
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([fc.integer(), fc.preprintDoi()])('when the record is restricted', async (id, preprintDoi) => {
    const record: Record = {
      conceptdoi: Doi('10.5072/zenodo.1061863'),
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
        access_right: 'restricted',
        communities: [{ id: 'prereview-reviews' }],
        creators: [{ name: 'PREreviewer' }],
        description: 'Description',
        doi: Doi('10.5281/zenodo.1061864'),
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
  })

  test.prop([fc.integer(), fc.preprintDoi()])('when the record is not in the community', async (id, preprintDoi) => {
    const record: Record = {
      conceptdoi: Doi('10.5072/zenodo.1061863'),
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
        doi: Doi('10.5281/zenodo.1061864'),
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
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
      conceptdoi: Doi('10.5072/zenodo.1061863'),
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
        doi: Doi('10.5281/zenodo.1061864'),
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
  })

  test.prop([fc.integer(), fc.preprintDoi(), fc.string()])(
    'when the record does not have a CC-BY-4.0/CC0-1.0 license',
    async (id, preprintDoi, license) => {
      const record: Record = {
        conceptdoi: Doi('10.5072/zenodo.1061863'),
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
          doi: Doi('10.5281/zenodo.1061864'),
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
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsUnavailable()))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer(), fc.oneof(fc.string(), fc.nonPreprintDoi())])(
    'when the record does not review a preprint with a preprint DOI',
    async (id, identifier) => {
      const record: Record = {
        conceptdoi: Doi('10.5072/zenodo.1061863'),
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
          doi: Doi('10.5281/zenodo.1061864'),
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
        wasPrereviewRemoved: () => false,
      })()

      expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
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
      conceptdoi: Doi('10.5072/zenodo.1061863'),
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
        doi: Doi('10.5281/zenodo.1061864'),
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
      wasPrereviewRemoved: () => false,
    })()

    expect(actual).toStrictEqual(E.left(new Prereview.PrereviewIsNotFound()))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForProfileFromZenodo', () => {
  describe('when the PREreviews can be loaded', () => {
    test.prop([
      fc.orcidProfileId(),
      fc.preprintTitle(),
      fc.preprintTitle(),
      fc.oneof(
        fc.constant([0, []]),
        fc.constant([1, [{ name: '1 other author' }]]),
        fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
      ),
    ])('with an ORCID iD', async (profile, preprint1, preprint2, [expectedAnonymous, otherAuthors]) => {
      const records: Records = {
        hits: {
          total: 2,
          hits: [
            {
              conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                creators: [{ name: 'PREreviewer' }, ...otherAuthors],
                description: 'Description',
                doi: Doi('10.5281/zenodo.1061864'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-04'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.01.13.476201'),
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
              conceptdoi: Doi('10.5072/zenodo.1065235'),
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
                doi: Doi('10.5281/zenodo.1065236'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-05'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.02.14.480364'),
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
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.creators.person_or_org.identifiers.identifier:${profile.orcid}`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
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
            .otherwise(() => TE.left(new PreprintIsNotFound({}))),
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: [],
            subfields: [],
            preprint: preprint1,
          },
          {
            club: undefined,
            id: 1065236,
            reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
            published: new Temporal.PlainDate(2022, 7, 5),
            fields: [],
            subfields: [],
            preprint: preprint2,
          },
        ]),
      )
    })

    test.prop([
      fc.pseudonymProfileId(),
      fc.preprintTitle(),
      fc.preprintTitle(),
      fc.clubId(),
      fc.oneof(
        fc.constant([0, []]),
        fc.constant([1, [{ name: '1 other author' }]]),
        fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
      ),
    ])('with a pseudonym', async (profile, preprint1, preprint2, club, [expectedAnonymous, otherAuthors]) => {
      const records: Records = {
        hits: {
          total: 2,
          hits: [
            {
              conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                creators: [{ name: 'PREreviewer' }, ...otherAuthors],
                description: 'Description',
                doi: Doi('10.5281/zenodo.1061864'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-04'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.01.13.476201'),
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
              conceptdoi: Doi('10.5072/zenodo.1065235'),
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
                doi: Doi('10.5281/zenodo.1065236'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-05'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.02.14.480364'),
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
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.creators.person_or_org.name:"${profile.pseudonym}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
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
            .otherwise(() => TE.left(new PreprintIsNotFound({}))),
        clock: SystemClock,
        logger: () => IO.of(undefined),
      })()

      expect(actual).toStrictEqual(
        E.right([
          {
            club: undefined,
            id: 1061864,
            reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
            published: new Temporal.PlainDate(2022, 7, 4),
            fields: ['13', '11'],
            subfields: ['1310', '1311', '1106'],
            preprint: preprint1,
          },
          {
            club,
            id: 1065236,
            reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
            published: new Temporal.PlainDate(2022, 7, 5),
            fields: [],
            subfields: [],
            preprint: preprint2,
          },
        ]),
      )
    })
  })

  test.prop([
    fc.profileId(),
    fc.preprintTitle(),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when a preprint cannot be loaded', async (profile, preprint, error) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            access_status: 'open',
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
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club: undefined,
          id: 1061864,
          reviewers: { named: ['PREreviewer'], anonymous: 0 },
          published: new Temporal.PlainDate(2022, 7, 4),
          fields: [],
          subfields: [],
          preprint,
        },
      ]),
    )
  })

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
          access_status: 'open',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForProfileFromZenodo(profile)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForUserFromZenodo', () => {
  test.prop([
    fc.user(),
    fc.preprintTitle(),
    fc.preprintTitle(),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
  ])('when the PREreviews can be loaded', async (user, preprint1, preprint2, [expectedAnonymous, otherAuthors]) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              creators: [{ name: 'PREreviewer' }, ...otherAuthors],
              description: 'Description',
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (metadata.creators.person_or_org.identifiers.identifier:${user.orcid} metadata.creators.person_or_org.name:"${user.pseudonym}")`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
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
          .otherwise(() => TE.left(new PreprintIsNotFound({}))),
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club: undefined,
          id: 1061864,
          reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
          published: new Temporal.PlainDate(2022, 7, 4),
          fields: ['13', '11'],
          subfields: ['1310', '1311', '1106'],
          preprint: preprint1,
        },
        {
          club: undefined,
          id: 1065236,
          reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
          published: new Temporal.PlainDate(2022, 7, 5),
          fields: [],
          subfields: [],
          preprint: preprint2,
        },
      ]),
    )
  })

  test.prop([
    fc.user(),
    fc.preprintTitle(),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when a preprint cannot be loaded', async (user, preprint, error) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            access_status: 'open',
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
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club: undefined,
          id: 1061864,
          reviewers: { named: ['PREreviewer'], anonymous: 0 },
          published: new Temporal.PlainDate(2022, 7, 4),
          fields: [],
          subfields: [],
          preprint,
        },
      ]),
    )
  })

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
          access_status: 'open',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForUserFromZenodo(user)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })
})

describe('getPrereviewsForClubFromZenodo', () => {
  test.prop([
    fc.clubId(),
    fc.preprintTitle(),
    fc.preprintTitle(),
    fc.oneof(
      fc.constant([0, []]),
      fc.constant([1, [{ name: '1 other author' }]]),
      fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
    ),
  ])('when the PREreviews can be loaded', async (club, preprint1, preprint2, [expectedAnonymous, otherAuthors]) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              creators: [{ name: 'PREreviewer' }, ...otherAuthors],
              contributors: [
                {
                  name: getClubName(club),
                  type: 'ResearchGroup',
                },
              ],
              description: 'Description',
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
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
          .otherwise(() => TE.left(new PreprintIsNotFound({}))),
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club,
          id: 1061864,
          reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
          fields: ['13', '11'],
          subfields: ['1310', '1311', '1106'],
          published: new Temporal.PlainDate(2022, 7, 4),
          preprint: preprint1,
        },
        {
          club,
          id: 1065236,
          reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
          fields: [],
          subfields: [],
          published: new Temporal.PlainDate(2022, 7, 5),
          preprint: preprint2,
        },
      ]),
    )
  })

  test.prop([fc.clubId()])('when there are no Prereviews', async club => {
    const actual = await _.getPrereviewsForClubFromZenodo(club)({
      fetch: fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
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
    })()

    expect(actual).toStrictEqual(E.right([]))
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
          q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
          size: '100',
          sort: 'publication-desc',
          resource_type: 'publication::publication-peerreview',
          access_status: 'open',
        },
      },
      { status },
    )

    const actual = await _.getPrereviewsForClubFromZenodo(club)({
      clock: SystemClock,
      fetch,
      getPreprintTitle: shouldNotBeCalled,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.clubId(),
    fc.preprintTitle(),
    fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
  ])('when a preprint cannot be loaded', async (club, preprint, error) => {
    const records: Records = {
      hits: {
        total: 2,
        hits: [
          {
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-04'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.01.13.476201'),
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
            conceptdoi: Doi('10.5072/zenodo.1065235'),
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
              doi: Doi('10.5281/zenodo.1065236'),
              language: 'eng',
              license: { id: 'cc-by-4.0' },
              publication_date: new Date('2022-07-05'),
              related_identifiers: [
                {
                  scheme: 'doi',
                  identifier: Doi('10.1101/2022.02.14.480364'),
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
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
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
          .otherwise(() => TE.left(new PreprintIsNotFound({}))),
      clock: SystemClock,
      logger: () => IO.of(undefined),
    })()

    expect(actual).toStrictEqual(
      E.right([
        {
          club,
          id: 1061864,
          reviewers: { named: ['PREreviewer'], anonymous: 0 },
          fields: [],
          subfields: [],
          published: new Temporal.PlainDate(2022, 7, 4),
          preprint,
        },
      ]),
    )
  })

  test.prop([fc.clubId(), fc.preprintTitle(), fc.preprintTitle()])(
    'when a review is not part of the club',
    async (club, preprint1, preprint2) => {
      const records: Records = {
        hits: {
          total: 1,
          hits: [
            {
              conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                doi: Doi('10.5281/zenodo.1061864'),
                language: 'eng',
                license: { id: 'cc-by-4.0' },
                publication_date: new Date('2022-07-04'),
                related_identifiers: [
                  {
                    scheme: 'doi',
                    identifier: Doi('10.1101/2022.01.13.476201'),
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
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND metadata.contributors.person_or_org.name:"${getClubName(club).replaceAll('\\', '\\\\')}"`,
              size: '100',
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
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
            .otherwise(() => TE.left(new PreprintIsNotFound({}))),
        clock: SystemClock,
        logger: () => IO.of(undefined),
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
            conceptdoi: Doi('10.5072/zenodo.1061863'),
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
              doi: Doi('10.5281/zenodo.1061864'),
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
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
            },
          },
          {
            body: RecordsC.encode(records),
            status: Status.OK,
          },
        )
        .getOnce('http://example.com/review.html/content', { body: 'Some text' }),
      logger: () => IO.of(undefined),
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

  test.prop([fc.preprintId(), fc.integer({ min: 400, max: 599 })])(
    'when the PREreviews cannot be loaded',
    async (preprint, status) => {
      const fetch = fetchMock.sandbox().getOnce(
        {
          url: 'begin:https://zenodo.org/api/communities/prereview-reviews/records?',
          query: {
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
        },
        { status },
      )

      const actual = await _.getPrereviewsForPreprintFromZenodo(preprint)({
        clock: SystemClock,
        fetch,
        logger: () => IO.of(undefined),
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
              conceptdoi: Doi('10.5072/zenodo.1061863'),
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
                doi: Doi('10.5281/zenodo.1061864'),
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
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
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
      fc
        .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
        .map(response => Promise.resolve(response)),
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

describe('createCommentOnZenodo', () => {
  test.prop([
    fc.record({
      author: fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
      comment: fc.html(),
      prereview: fc.prereview(),
    }),
    fc.string(),
    fc.origin(),
    fc.doi(),
  ])('when the comment can be created', async (comment, zenodoApiKey, publicUrl, commentDoi) => {
    const emptyDeposition: EmptyDeposition = {
      id: 1,
      links: {
        bucket: new URL('http://example.com/bucket'),
        self: new URL('http://example.com/self'),
      },
      metadata: {
        prereserve_doi: {
          doi: commentDoi,
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
        creators: [{ name: 'A PREreviewer' }],
        description: 'Description',
        prereserve_doi: {
          doi: commentDoi,
        },
        title: 'Title',
        upload_type: 'publication',
        publication_type: 'other',
      },
      state: 'unsubmitted',
      submitted: false,
    }
    const reviewUrl = `${publicUrl.href.slice(0, -1)}${format(reviewMatch.formatter, { id: comment.prereview.id })}`
    const fetch = fetchMock.sandbox()
    const actual = await _.createCommentOnZenodo(comment)({
      clock: SystemClock,
      fetch: fetch
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
                publication_type: 'other',
                title: plainText`Comment on a PREreview of “${comment.prereview.preprint.title}”`.toString(),
                creators: [comment.author],
                description: `<p><strong>This Zenodo record is a permanently preserved version of a comment on a PREreview. You can view the complete PREreview and comments at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${comment.comment.toString()}`,
                communities: [{ identifier: 'prereview-reviews' }],
                related_identifiers: [
                  {
                    ..._.toExternalIdentifier(comment.prereview.preprint.id),
                    relation: 'references',
                    resource_type: 'publication-preprint',
                  },
                  {
                    identifier: comment.prereview.doi,
                    relation: 'references',
                    resource_type: 'publication-peerreview',
                    scheme: 'doi',
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
            url: 'http://example.com/bucket/comment.html',
            headers: { 'Content-Type': 'application/octet-stream' },
            functionMatcher: (_, req) => req.body === comment.comment.toString(),
          },
          {
            status: Status.Created,
          },
        ),
      logger: () => IO.of(undefined),
      publicUrl,
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.right([commentDoi, 1]))
    expect(fetch.done()).toBeTruthy()
  })

  test.prop([
    fc.record({
      author: fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
      comment: fc.html(),
      prereview: fc.prereview(),
    }),
    fc.string(),
    fc.origin(),
    fc.oneof(
      fc
        .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
        .map(response => Promise.resolve(response)),
      fc.error().map(error => Promise.reject(error)),
    ),
  ])('Zenodo is unavailable', async (comment, zenodoApiKey, publicUrl, response) => {
    const actual = await _.createCommentOnZenodo(comment)({
      clock: SystemClock,
      fetch: () => response,
      logger: () => IO.of(undefined),
      publicUrl,
      zenodoApiKey,
    })()

    expect(actual).toStrictEqual(E.left('unavailable'))
  })
})

describe('publishDepositionOnZenodo', () => {
  test.prop([fc.integer(), fc.string(), fc.doi()])(
    'when the deposition can be published',
    async (id, zenodoApiKey, depositionDoi) => {
      const unsubmittedDeposition: UnsubmittedDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          publish: new URL('http://example.com/publish'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          creators: [{ name: 'A PREreviewer' }],
          description: 'Description',
          prereserve_doi: {
            doi: depositionDoi,
          },
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'other',
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
          creators: [{ name: 'A PREreviewer' }],
          description: 'Description',
          doi: depositionDoi,
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'other',
        },
        state: 'done',
        submitted: true,
      }
      const fetch = fetchMock.sandbox()
      const actual = await _.publishDepositionOnZenodo(id)({
        clock: SystemClock,
        fetch: fetch
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
            status: Status.OK,
          })
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: Status.Accepted,
          }),
        logger: () => IO.of(undefined),
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.right(undefined))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([fc.integer(), fc.string(), fc.doi()])(
    'when the deposition is empty',
    async (id, zenodoApiKey, depositionDoi) => {
      const emptyDeposition: EmptyDeposition = {
        id: 1,
        links: {
          bucket: new URL('http://example.com/bucket'),
          self: new URL('http://example.com/self'),
        },
        metadata: {
          prereserve_doi: {
            doi: depositionDoi,
          },
        },
        state: 'unsubmitted',
        submitted: false,
      }
      const fetch = fetchMock.sandbox()
      const actual = await _.publishDepositionOnZenodo(id)({
        clock: SystemClock,
        fetch: fetch.getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
          body: EmptyDepositionC.encode(emptyDeposition),
          status: Status.OK,
        }),
        logger: () => IO.of(undefined),
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )
  test.prop([fc.integer(), fc.string(), fc.doi()])(
    'when the deposition is submitted',
    async (id, zenodoApiKey, depositionDoi) => {
      const submittedDeposition: SubmittedDeposition = {
        id: 1,
        links: {
          edit: new URL('http://example.com/edit'),
        },
        metadata: {
          creators: [{ name: 'A PREreviewer' }],
          description: 'Description',
          doi: depositionDoi,
          title: 'Title',
          upload_type: 'publication',
          publication_type: 'other',
        },
        state: 'done',
        submitted: true,
      }
      const fetch = fetchMock.sandbox()
      const actual = await _.publishDepositionOnZenodo(id)({
        clock: SystemClock,
        fetch: fetch.getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
          body: SubmittedDepositionC.encode(submittedDeposition),
          status: Status.OK,
        }),
        logger: () => IO.of(undefined),
        zenodoApiKey,
      })()

      expect(actual).toStrictEqual(E.left('unavailable'))
      expect(fetch.done()).toBeTruthy()
    },
  )

  test.prop([
    fc.integer(),
    fc.string(),
    fc.oneof(
      fc
        .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
        .map(response => Promise.resolve(response)),
      fc.error().map(error => Promise.reject(error)),
    ),
  ])('Zenodo is unavailable', async (id, zenodoApiKey, response) => {
    const actual = await _.publishDepositionOnZenodo(id)({
      clock: SystemClock,
      fetch: () => response,
      logger: () => IO.of(undefined),
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
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
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
                  license: match(newPrereview.license)
                    .with('CC-BY-4.0', () => 'cc-by-4.0')
                    .with('CC0-1.0', () => 'cc-zero')
                    .exhaustive(),
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                  ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(Array.isNonEmptyArray(subjects)
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
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
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
                  license: match(newPrereview.license)
                    .with('CC-BY-4.0', () => 'cc-by-4.0')
                    .with('CC0-1.0', () => 'cc-zero')
                    .exhaustive(),
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(
                    String.isString,
                  ),
                  ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(Array.isNonEmptyArray(subjects)
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
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
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
                  license: match(newPrereview.license)
                    .with('CC-BY-4.0', () => 'cc-by-4.0')
                    .with('CC0-1.0', () => 'cc-zero')
                    .exhaustive(),
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  ...(requested ? { keywords: ['Requested PREreview'] } : {}),
                  ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(Array.isNonEmptyArray(subjects)
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
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
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
                  license: match(newPrereview.license)
                    .with('CC-BY-4.0', () => 'cc-by-4.0')
                    .with('CC0-1.0', () => 'cc-zero')
                    .exhaustive(),
                  communities: [{ identifier: 'prereview-reviews' }],
                  description: `<p><strong>This Zenodo record is a permanently preserved version of a Structured PREreview. You can view the complete PREreview at <a href="${reviewUrl}">${reviewUrl}</a>.</strong></p>

${newPrereview.review.toString()}`,
                  keywords: [requested ? 'Requested PREreview' : undefined, 'Structured PREreview'].filter(
                    String.isString,
                  ),
                  ...(Option.isSome(newPrereview.language) ? { language: newPrereview.language.value } : {}),
                  ...(Array.isNonEmptyArray(subjects)
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
      license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
      locale: fc.supportedLocale(),
      structured: fc.boolean(),
      user: fc.user(),
    }),
    fc.array(fc.record({ id: fc.url(), name: fc.string() })),
    fc.boolean(),
    fc.string(),
    fc.origin(),
    fc.oneof(
      fc
        .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
        .map(response => Promise.resolve(response)),
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
