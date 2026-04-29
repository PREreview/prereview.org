import { it } from '@effect/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { SystemClock } from 'clock-ts'
import { Doi } from 'doi-ts'
import { Array, Effect, Option, pipe, String } from 'effect'
import fetchMock from 'fetch-mock'
import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as IO from 'fp-ts/lib/IO.js'
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import { describe, expect, vi } from 'vitest'
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
import { getClubName, getClubNameAndFormerNames } from '../../../src/Clubs/index.ts'
import * as _ from '../../../src/ExternalInteractions/ZenodoRecords/legacy-zenodo.ts'
import { plainText, rawHtml } from '../../../src/html.ts'
import type * as Personas from '../../../src/Personas/index.ts'
import { PreprintIsNotFound, PreprintIsUnavailable } from '../../../src/Preprints/index.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import { reviewMatch } from '../../../src/routes.ts'
import * as StatusCodes from '../../../src/StatusCodes.ts'
import { OrcidId, Uuid } from '../../../src/types/index.ts'
import { iso6391To3 } from '../../../src/types/iso639.ts'
import type { NewPrereview } from '../../../src/WebApp/write-review/index.ts'
import * as fc from '../../fc.ts'
import { shouldNotBeCalled } from '../../should-not-be-called.ts'

describe('getRecentPrereviewsFromZenodo', () => {
  it.effect.prop(
    'when the PREreviews can be loaded',
    [
      fc.origin(),
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
    ],
    ([publicUrl, page, field, language, query, preprint1, preprint2, [expectedAnonymous, otherAuthors]]) =>
      Effect.gen(function* () {
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
              {
                conceptdoi: Doi('10.5072/zenodo.385226'),
                conceptrecid: 385226,
                files: [
                  {
                    links: {
                      self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                    },
                    key: 'review.html',
                    size: 2327,
                  },
                ],
                id: 385227,
                links: {
                  latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                  latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                  description: 'Description',
                  doi: Doi('10.5072/zenodo.385227'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2025-10-15'),
                  related_identifiers: [
                    {
                      identifier: '10.5061/dryad.wstqjq2n3',
                      relation: 'reviews',
                      resource_type: 'dataset',
                      scheme: 'doi',
                    },
                    {
                      identifier: `${publicUrl.origin}/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d`,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title:
                    'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                },
              },
            ],
          },
        }

        const actual = yield* Effect.promise(
          _.getRecentPrereviewsFromZenodo({ field, language, page, query })({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    page,
                    size: '5',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                    q: `(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:${new RegExp(`${publicUrl.origin}/reviews/.+`)}))${
                      field
                        ? ` AND custom_fields.legacy\\:subjects.identifier:"https://openalex.org/fields/${field}"`
                        : ''
                    }${language ? ` AND language:"${iso6391To3(language)}"` : ''}${query ? ` AND (title:"${query}"~5 OR metadata.creators.person_or_org.name:"${query}"~5)` : ''}`,
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                .otherwise(() => TE.left(new PreprintIsNotFound({}))),
            logger: () => IO.of(undefined),
            publicUrl,
          }),
        )

        expect(actual).toStrictEqual(
          E.right({
            currentPage: page,
            field,
            language,
            query,
            recentPrereviews: [
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1061864,
                reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
                published: new Temporal.PlainDate(2022, 7, 4),
                fields: ['13', '11'],
                subfields: ['1310', '1311', '1106'],
                preprint: preprint1,
              }),
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1065236,
                reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
                published: new Temporal.PlainDate(2022, 7, 5),
                fields: [],
                subfields: [],
                preprint: preprint2,
              }),
              {
                _tag: 'DatasetReview',
                id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
              },
            ],
            totalPages: 1,
          }),
        )
      }),
  )

  it.effect.prop(
    'when a preprint cannot be loaded',
    [
      fc.integer({ min: 1 }),
      fc.preprintTitle(),
      fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
    ],
    ([page, preprint, error]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getRecentPrereviewsFromZenodo({ page })({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: '(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:/http:\\/\\/example.com\\/reviews\\/.+/))',
                    page,
                    size: '5',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint))
                .otherwise(() => TE.left(error)),
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(
          E.right({
            currentPage: page,
            field: undefined,
            language: undefined,
            query: undefined,
            recentPrereviews: [
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1061864,
                reviewers: { named: ['PREreviewer'], anonymous: 0 },
                published: new Temporal.PlainDate(2022, 7, 4),
                fields: [],
                subfields: [],
                preprint,
              }),
            ],
            totalPages: 1,
          }),
        )
      }),
  )

  it.effect.prop(
    'when none of the preprints can be loaded',
    [
      fc.integer({ min: 1 }),
      fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
      fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
    ],
    ([page, error1, error2]) =>
      Effect.gen(function* () {
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

        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            q: '(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:/http:\\/\\/example.com\\/reviews\\/.+/))',
            page: page.toString(),
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: {
            body: RecordsC.encode(records),
            status: StatusCodes.OK,
          },
        })

        const actual = yield* Effect.promise(
          _.getRecentPrereviewsFromZenodo({ page })({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.left(error1))
                .otherwise(() => TE.left(error2)),
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop('when the list is empty', [fc.integer({ min: 1 })], ([page]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.getRecentPrereviewsFromZenodo({ page })({
          clock: SystemClock,
          fetch: (...args) =>
            fetchMock
              .createInstance()
              .getOnce({
                url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                query: {
                  page: page.toString(),
                  size: '5',
                  sort: 'publication-desc',
                  resource_type: 'publication::publication-peerreview',
                  access_status: 'open',
                },
                response: {
                  body: RecordsC.encode({ hits: { total: 0, hits: [] } }),
                  status: StatusCodes.OK,
                },
              })
              .fetchHandler(...args),
          getPreprintTitle: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          publicUrl: new URL('http://example.com'),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )

  it.effect.prop(
    'when the PREreviews cannot be loaded',
    [fc.integer({ min: 1 }), fc.integer({ min: 400, max: 599 })],
    ([page, status]) =>
      Effect.gen(function* () {
        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            page: page.toString(),
            size: '5',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: { status },
        })

        const actual = yield* Effect.promise(
          _.getRecentPrereviewsFromZenodo({ page })({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprintTitle: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop('when the page number is impossible', [fc.integer({ max: 0 })], ([page]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.getRecentPrereviewsFromZenodo({ page })({
          clock: SystemClock,
          fetch: shouldNotBeCalled,
          getPreprintTitle: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          publicUrl: new URL('http://example.com'),
        }),
      )

      expect(actual).toStrictEqual(E.left('not-found'))
    }),
  )
})

describe('getPrereviewFromZenodo', () => {
  it.effect.prop(
    'when the PREreview can be loaded',
    [
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
    ],
    ([
      id,
      preprint,
      club,
      requested,
      structured,
      live,
      [expectedAnonymous, otherAuthors],
      [expectedLicense, license],
    ]) =>
      Effect.gen(function* () {
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

        const getPreprint = vi.fn(_ => TE.right(preprint))

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: StatusCodes.OK,
                })
                .getOnce({
                  url: 'http://example.com/review.html/content',
                  matcherFunction: ({ options }) => options.cache === 'force-cache',
                  response: { body: 'Some text' },
                })
                .fetchHandler(...args),
            getPreprint,
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(
          E.right(
            new Prereviews.Prereview({
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
      }),
  )

  it.effect.prop('when the review was removed', [fc.integer()], ([id]) =>
    Effect.gen(function* () {
      const wasPrereviewRemoved = vi.fn<_.WasPrereviewRemovedEnv['wasPrereviewRemoved']>(_ => true)

      const actual = yield* Effect.promise(
        _.getPrereviewFromZenodo(id)({
          clock: SystemClock,
          fetch: shouldNotBeCalled,
          getPreprint: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          wasPrereviewRemoved,
        }),
      )

      expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewWasRemoved()))
    }),
  )

  it.effect.prop(
    'when the review is not found',
    [fc.integer(), fc.constantFrom(StatusCodes.NotFound, StatusCodes.Gone)],
    ([id, status]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: undefined,
                  status,
                })
                .fetchHandler(...args),
            getPreprint: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
      }),
  )

  it.effect.prop(
    'when the review text cannot be loaded',
    [fc.integer(), fc.preprint(), fc.integer({ min: 400, max: 599 })],
    ([id, preprint, textStatus]) =>
      Effect.gen(function* () {
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
          .createInstance()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: StatusCodes.OK,
          })
          .getOnce('http://example.com/review.html/content', { status: textStatus })

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprint: () => TE.right(preprint),
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsUnavailable()))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop('when the review cannot be loaded', [fc.integer()], ([id]) =>
    Effect.gen(function* () {
      const fetch = fetchMock.createInstance().getOnce(`https://zenodo.org/api/records/${id}`, {
        body: undefined,
        status: StatusCodes.ServiceUnavailable,
      })

      const actual = yield* Effect.promise(
        _.getPrereviewFromZenodo(id)({
          clock: SystemClock,
          fetch: (...args) => fetch.fetchHandler(...args),
          getPreprint: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          wasPrereviewRemoved: () => false,
        }),
      )

      expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsUnavailable()))
      expect(fetch.callHistory.done()).toBeTruthy()
    }),
  )

  it.effect.prop(
    'when the preprint cannot be loaded',
    [fc.integer(), fc.preprintDoi(), fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({}))],
    ([id, preprintDoi, error]) =>
      Effect.gen(function* () {
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
          .createInstance()
          .getOnce(`https://zenodo.org/api/records/${id}`, {
            body: RecordC.encode(record),
            status: StatusCodes.OK,
          })
          .getOnce('http://example.com/review.html/content', { body: 'Some text' })

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprint: () => TE.left(error),
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(
          E.left(
            error._tag === 'PreprintIsNotFound'
              ? new Prereviews.PrereviewIsNotFound()
              : new Prereviews.PrereviewIsUnavailable(),
          ),
        )
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop('when the record is restricted', [fc.integer(), fc.preprintDoi()], ([id, preprintDoi]) =>
    Effect.gen(function* () {
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

      const actual = yield* Effect.promise(
        _.getPrereviewFromZenodo(id)({
          clock: SystemClock,
          fetch: (...args) =>
            fetchMock
              .createInstance()
              .getOnce(`https://zenodo.org/api/records/${id}`, {
                body: RecordC.encode(record),
                status: StatusCodes.OK,
              })
              .fetchHandler(...args),
          getPreprint: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          wasPrereviewRemoved: () => false,
        }),
      )

      expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
    }),
  )

  it.effect.prop('when the record is not in the community', [fc.integer(), fc.preprintDoi()], ([id, preprintDoi]) =>
    Effect.gen(function* () {
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

      const actual = yield* Effect.promise(
        _.getPrereviewFromZenodo(id)({
          clock: SystemClock,
          fetch: (...args) =>
            fetchMock
              .createInstance()
              .getOnce(`https://zenodo.org/api/records/${id}`, {
                body: RecordC.encode(record),
                status: StatusCodes.OK,
              })
              .fetchHandler(...args),
          getPreprint: shouldNotBeCalled,
          logger: () => IO.of(undefined),
          wasPrereviewRemoved: () => false,
        }),
      )

      expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
    }),
  )

  it.effect.prop(
    'when the record is not a peer review',
    [
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
    ],
    ([id, preprintDoi, publicationType]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: StatusCodes.OK,
                })
                .fetchHandler(...args),
            getPreprint: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
      }),
  )

  it.effect.prop(
    'when the record does not have a CC-BY-4.0/CC0-1.0 license',
    [fc.integer(), fc.preprintDoi(), fc.string()],
    ([id, preprintDoi, license]) =>
      Effect.gen(function* () {
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

        const fetch = fetchMock.createInstance().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: StatusCodes.OK,
        })

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprint: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsUnavailable()))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the record does not review a preprint with a preprint DOI',
    [fc.integer(), fc.oneof(fc.string(), fc.nonPreprintDoi())],
    ([id, identifier]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce(`https://zenodo.org/api/records/${id}`, {
                  body: RecordC.encode(record),
                  status: StatusCodes.OK,
                })
                .fetchHandler(...args),
            getPreprint: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
      }),
  )

  it.effect.prop(
    'when the record does not have a HTML file',
    [
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
    ],
    ([id, preprint, files]) =>
      Effect.gen(function* () {
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

        const fetch = fetchMock.createInstance().getOnce(`https://zenodo.org/api/records/${id}`, {
          body: RecordC.encode(record),
          status: StatusCodes.OK,
        })

        const actual = yield* Effect.promise(
          _.getPrereviewFromZenodo(id)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprint: () => TE.right(preprint),
            logger: () => IO.of(undefined),
            wasPrereviewRemoved: () => false,
          }),
        )

        expect(actual).toStrictEqual(E.left(new Prereviews.PrereviewIsNotFound()))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )
})

describe('getPrereviewsForProfileFromZenodo', () => {
  describe('when the PREreviews can be loaded', () => {
    it.effect.prop(
      'with an ORCID iD',
      [
        fc.origin(),
        fc.orcidProfileId(),
        fc.preprintTitle(),
        fc.preprintTitle(),
        fc.oneof(
          fc.constant([0, []]),
          fc.constant([1, [{ name: '1 other author' }]]),
          fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
        ),
      ],
      ([publicUrl, profile, preprint1, preprint2, [expectedAnonymous, otherAuthors]]) =>
        Effect.gen(function* () {
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
                {
                  conceptdoi: Doi('10.5072/zenodo.385226'),
                  conceptrecid: 385226,
                  files: [
                    {
                      links: {
                        self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                      },
                      key: 'review.html',
                      size: 2327,
                    },
                  ],
                  id: 385227,
                  links: {
                    latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                    latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                  },
                  metadata: {
                    access_right: 'open',
                    communities: [{ id: 'prereview-reviews' }],
                    creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                    description: 'Description',
                    doi: Doi('10.5072/zenodo.385227'),
                    license: { id: 'cc-by-4.0' },
                    publication_date: new Date('2025-10-15'),
                    related_identifiers: [
                      {
                        identifier: '10.5061/dryad.wstqjq2n3',
                        relation: 'reviews',
                        resource_type: 'dataset',
                        scheme: 'doi',
                      },
                      {
                        identifier: `${publicUrl.origin}/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d`,
                        relation: 'isIdenticalTo',
                        resource_type: 'publication-peerreview',
                        scheme: 'url',
                      },
                    ],
                    resource_type: {
                      type: 'publication',
                      subtype: 'peerreview',
                    },
                    title:
                      'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                  },
                },
              ],
            },
          }

          const actual = yield* Effect.promise(
            _.getPrereviewsForProfileFromZenodo(profile)({
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .getOnce({
                    url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                    query: {
                      q: `(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:${new RegExp(`${publicUrl.origin}/reviews/.+`)})) AND metadata.creators.person_or_org.identifiers.identifier:${profile.orcid}`,
                      size: '100',
                      sort: 'publication-desc',
                      resource_type: 'publication::publication-peerreview',
                      access_status: 'open',
                    },
                    response: {
                      body: RecordsC.encode(records),
                      status: StatusCodes.OK,
                    },
                  })
                  .fetchHandler(...args),
              getPreprintTitle: id =>
                match(id.value as unknown)
                  .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                  .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                  .otherwise(() => TE.left(new PreprintIsNotFound({}))),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              publicUrl,
            }),
          )

          expect(actual).toStrictEqual(
            E.right([
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1061864,
                reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
                published: new Temporal.PlainDate(2022, 7, 4),
                fields: [],
                subfields: [],
                preprint: preprint1,
              }),
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1065236,
                reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
                published: new Temporal.PlainDate(2022, 7, 5),
                fields: [],
                subfields: [],
                preprint: preprint2,
              }),
              {
                _tag: 'DatasetReview',
                id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
              },
            ]),
          )
        }),
    )

    it.effect.prop(
      'with a pseudonym',
      [
        fc.origin(),
        fc.pseudonymProfileId(),
        fc.preprintTitle(),
        fc.preprintTitle(),
        fc.clubId(),
        fc.oneof(
          fc.constant([0, []]),
          fc.constant([1, [{ name: '1 other author' }]]),
          fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
        ),
      ],
      ([publicUrl, profile, preprint1, preprint2, club, [expectedAnonymous, otherAuthors]]) =>
        Effect.gen(function* () {
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
                {
                  conceptdoi: Doi('10.5072/zenodo.385226'),
                  conceptrecid: 385226,
                  files: [
                    {
                      links: {
                        self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                      },
                      key: 'review.html',
                      size: 2327,
                    },
                  ],
                  id: 385227,
                  links: {
                    latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                    latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                  },
                  metadata: {
                    access_right: 'open',
                    communities: [{ id: 'prereview-reviews' }],
                    creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                    description: 'Description',
                    doi: Doi('10.5072/zenodo.385227'),
                    license: { id: 'cc-by-4.0' },
                    publication_date: new Date('2025-10-15'),
                    related_identifiers: [
                      {
                        identifier: '10.5061/dryad.wstqjq2n3',
                        relation: 'reviews',
                        resource_type: 'dataset',
                        scheme: 'doi',
                      },
                      {
                        identifier: `${publicUrl.origin}/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d`,
                        relation: 'isIdenticalTo',
                        resource_type: 'publication-peerreview',
                        scheme: 'url',
                      },
                    ],
                    resource_type: {
                      type: 'publication',
                      subtype: 'peerreview',
                    },
                    title:
                      'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                  },
                },
              ],
            },
          }

          const actual = yield* Effect.promise(
            _.getPrereviewsForProfileFromZenodo(profile)({
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .getOnce({
                    url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                    query: {
                      q: `(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:${new RegExp(`${publicUrl.origin}/reviews/.+`)})) AND metadata.creators.person_or_org.name:"${profile.pseudonym}"`,
                      size: '100',
                      sort: 'publication-desc',
                      resource_type: 'publication::publication-peerreview',
                      access_status: 'open',
                    },
                    response: {
                      body: RecordsC.encode(records),
                      status: StatusCodes.OK,
                    },
                  })
                  .fetchHandler(...args),
              getPreprintTitle: id =>
                match(id.value as unknown)
                  .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                  .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                  .otherwise(() => TE.left(new PreprintIsNotFound({}))),
              clock: SystemClock,
              logger: () => IO.of(undefined),
              publicUrl,
            }),
          )

          expect(actual).toStrictEqual(
            E.right([
              new Prereviews.RecentPreprintPrereview({
                club: undefined,
                id: 1061864,
                reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
                published: new Temporal.PlainDate(2022, 7, 4),
                fields: ['13', '11'],
                subfields: ['1310', '1311', '1106'],
                preprint: preprint1,
              }),
              new Prereviews.RecentPreprintPrereview({
                club,
                id: 1065236,
                reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
                published: new Temporal.PlainDate(2022, 7, 5),
                fields: [],
                subfields: [],
                preprint: preprint2,
              }),
              {
                _tag: 'DatasetReview',
                id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
              },
            ]),
          )
        }),
    )
  })

  it.effect.prop(
    'when a preprint cannot be loaded',
    [fc.profileId(), fc.preprintTitle(), fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({}))],
    ([profile, preprint, error]) =>
      Effect.gen(function* () {
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
              {
                conceptdoi: Doi('10.5072/zenodo.385226'),
                conceptrecid: 385226,
                files: [
                  {
                    links: {
                      self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                    },
                    key: 'review.html',
                    size: 2327,
                  },
                ],
                id: 385227,
                links: {
                  latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                  latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                  description: 'Description',
                  doi: Doi('10.5072/zenodo.385227'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2025-10-15'),
                  related_identifiers: [
                    {
                      identifier: '10.5061/dryad.wstqjq2n3',
                      relation: 'reviews',
                      resource_type: 'dataset',
                      scheme: 'doi',
                    },
                    {
                      identifier: 'http://example.com/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d',
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title:
                    'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                },
              },
            ],
          },
        }

        const actual = yield* Effect.promise(
          _.getPrereviewsForProfileFromZenodo(profile)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint))
                .otherwise(() => TE.left(error)),
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(
          E.right([
            new Prereviews.RecentPreprintPrereview({
              club: undefined,
              id: 1061864,
              reviewers: { named: ['PREreviewer'], anonymous: 0 },
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: [],
              subfields: [],
              preprint,
            }),
            {
              _tag: 'DatasetReview',
              id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
            },
          ]),
        )
      }),
  )

  it.effect.prop(
    'when the PREreviews cannot be loaded',
    [
      fc.profileId(),
      fc.integer({
        min: 400,
        max: 599,
      }),
    ],
    ([profile, status]) =>
      Effect.gen(function* () {
        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: { status },
        })

        const actual = yield* Effect.promise(
          _.getPrereviewsForProfileFromZenodo(profile)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprintTitle: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )
})

describe('getPrereviewsForUserFromZenodo', () => {
  it.effect.prop(
    'when the PREreviews can be loaded',
    [
      fc.origin(),
      fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
      fc.preprintTitle(),
      fc.preprintTitle(),
      fc.oneof(
        fc.constant([0, []]),
        fc.constant([1, [{ name: '1 other author' }]]),
        fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
      ),
    ],
    ([publicUrl, user, preprint1, preprint2, [expectedAnonymous, otherAuthors]]) =>
      Effect.gen(function* () {
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
              {
                conceptdoi: Doi('10.5072/zenodo.385226'),
                conceptrecid: 385226,
                files: [
                  {
                    links: {
                      self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                    },
                    key: 'review.html',
                    size: 2327,
                  },
                ],
                id: 385227,
                links: {
                  latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                  latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                  description: 'Description',
                  doi: Doi('10.5072/zenodo.385227'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2025-10-15'),
                  related_identifiers: [
                    {
                      identifier: '10.5061/dryad.wstqjq2n3',
                      relation: 'reviews',
                      resource_type: 'dataset',
                      scheme: 'doi',
                    },
                    {
                      identifier: `${publicUrl.origin}/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d`,
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title:
                    'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                },
              },
            ],
          },
        }

        const actual = yield* Effect.promise(
          _.getPrereviewsForUserFromZenodo(user)({
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: `(metadata.related_identifiers.resource_type.id:"publication-preprint" OR (metadata.related_identifiers.resource_type.id:"dataset" AND metadata.related_identifiers.identifier:${new RegExp(`${publicUrl.origin}/reviews/.+`)})) AND (metadata.creators.person_or_org.identifiers.identifier:${user.orcidId} metadata.creators.person_or_org.name:"${user.pseudonym}")`,
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                .otherwise(() => TE.left(new PreprintIsNotFound({}))),
            clock: SystemClock,
            logger: () => IO.of(undefined),
            publicUrl,
          }),
        )

        expect(actual).toStrictEqual(
          E.right([
            new Prereviews.RecentPreprintPrereview({
              club: undefined,
              id: 1061864,
              reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: ['13', '11'],
              subfields: ['1310', '1311', '1106'],
              preprint: preprint1,
            }),
            new Prereviews.RecentPreprintPrereview({
              club: undefined,
              id: 1065236,
              reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
              published: new Temporal.PlainDate(2022, 7, 5),
              fields: [],
              subfields: [],
              preprint: preprint2,
            }),
            {
              _tag: 'DatasetReview',
              id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
            },
          ]),
        )
      }),
  )

  it.effect.prop(
    'when a preprint cannot be loaded',
    [
      fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
      fc.preprintTitle(),
      fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({})),
    ],
    ([user, preprint, error]) =>
      Effect.gen(function* () {
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
              {
                conceptdoi: Doi('10.5072/zenodo.385226'),
                conceptrecid: 385226,
                files: [
                  {
                    links: {
                      self: new URL('https://sandbox.zenodo.org/api/records/385227/files/review.html/content'),
                    },
                    key: 'review.html',
                    size: 2327,
                  },
                ],
                id: 385227,
                links: {
                  latest: new URL('https://sandbox.zenodo.org/api/records/385227/versions/latest'),
                  latest_html: new URL('https://sandbox.zenodo.org/records/385227/latest'),
                },
                metadata: {
                  access_right: 'open',
                  communities: [{ id: 'prereview-reviews' }],
                  creators: [{ name: 'Chris Wilkinson', orcid: OrcidId.OrcidId('0000-0003-4921-6155') }],
                  description: 'Description',
                  doi: Doi('10.5072/zenodo.385227'),
                  license: { id: 'cc-by-4.0' },
                  publication_date: new Date('2025-10-15'),
                  related_identifiers: [
                    {
                      identifier: '10.5061/dryad.wstqjq2n3',
                      relation: 'reviews',
                      resource_type: 'dataset',
                      scheme: 'doi',
                    },
                    {
                      identifier: 'http://example.com/reviews/5c8553f4-acac-463d-ae3c-57d423dddf7d',
                      relation: 'isIdenticalTo',
                      resource_type: 'publication-peerreview',
                      scheme: 'url',
                    },
                  ],
                  resource_type: {
                    type: 'publication',
                    subtype: 'peerreview',
                  },
                  title:
                    'Structured PREreview of "Metadata collected from 500 articles in the field of ecology and evolution"',
                },
              },
            ],
          },
        }

        const actual = yield* Effect.promise(
          _.getPrereviewsForUserFromZenodo(user)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint))
                .otherwise(() => TE.left(error)),
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(
          E.right([
            new Prereviews.RecentPreprintPrereview({
              club: undefined,
              id: 1061864,
              reviewers: { named: ['PREreviewer'], anonymous: 0 },
              published: new Temporal.PlainDate(2022, 7, 4),
              fields: [],
              subfields: [],
              preprint,
            }),
            {
              _tag: 'DatasetReview',
              id: Uuid.Uuid('5c8553f4-acac-463d-ae3c-57d423dddf7d'),
            },
          ]),
        )
      }),
  )

  it.effect.prop(
    'when the PREreviews cannot be loaded',
    [
      fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
      fc.integer({
        min: 400,
        max: 599,
      }),
    ],
    ([user, status]) =>
      Effect.gen(function* () {
        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: { status },
        })

        const actual = yield* Effect.promise(
          _.getPrereviewsForUserFromZenodo(user)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprintTitle: shouldNotBeCalled,
            logger: () => IO.of(undefined),
            publicUrl: new URL('http://example.com'),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )
})

describe('getPrereviewsForClubFromZenodo', () => {
  it.effect.prop(
    'when the PREreviews can be loaded',
    [
      fc.clubId(),
      fc.preprintTitle(),
      fc.preprintTitle(),
      fc.oneof(
        fc.constant([0, []]),
        fc.constant([1, [{ name: '1 other author' }]]),
        fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
      ),
    ],
    ([club, preprint1, preprint2, [expectedAnonymous, otherAuthors]]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewsForClubFromZenodo(club)({
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (${Array.join(
                      Array.map(
                        getClubNameAndFormerNames(club),
                        name => `metadata.contributors.person_or_org.name:"${name.replaceAll('\\', '\\\\')}"`,
                      ),
                      ' OR ',
                    )})`,
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                .otherwise(() => TE.left(new PreprintIsNotFound({}))),
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(
          E.right([
            new Prereviews.RecentPreprintPrereview({
              club,
              id: 1061864,
              reviewers: { named: ['PREreviewer'], anonymous: expectedAnonymous },
              fields: ['13', '11'],
              subfields: ['1310', '1311', '1106'],
              published: new Temporal.PlainDate(2022, 7, 4),
              preprint: preprint1,
            }),
            new Prereviews.RecentPreprintPrereview({
              club,
              id: 1065236,
              reviewers: { named: ['Josiah Carberry'], anonymous: 0 },
              fields: [],
              subfields: [],
              published: new Temporal.PlainDate(2022, 7, 5),
              preprint: preprint2,
            }),
          ]),
        )
      }),
  )

  it.effect.prop('when there are no Prereviews', [fc.clubId()], ([club]) =>
    Effect.gen(function* () {
      const actual = yield* Effect.promise(
        _.getPrereviewsForClubFromZenodo(club)({
          fetch: (...args) =>
            fetchMock
              .createInstance()
              .getOnce({
                url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                query: {
                  q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (${Array.join(
                    Array.map(
                      getClubNameAndFormerNames(club),
                      name => `metadata.contributors.person_or_org.name:"${name.replaceAll('\\', '\\\\')}"`,
                    ),
                    ' OR ',
                  )})`,
                  size: '100',
                  sort: 'publication-desc',
                  resource_type: 'publication::publication-peerreview',
                  access_status: 'open',
                },
                response: {
                  body: RecordsC.encode({ hits: { hits: [], total: 0 } }),
                  status: StatusCodes.OK,
                },
              })
              .fetchHandler(...args),
          getPreprintTitle: shouldNotBeCalled,
          clock: SystemClock,
          logger: () => IO.of(undefined),
        }),
      )

      expect(actual).toStrictEqual(E.right([]))
    }),
  )

  it.effect.prop(
    'when the PREreviews cannot be loaded',
    [
      fc.clubId(),
      fc.integer({
        min: 400,
        max: 599,
      }),
    ],
    ([club, status]) =>
      Effect.gen(function* () {
        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (${Array.join(
              Array.map(
                getClubNameAndFormerNames(club),
                name => `metadata.contributors.person_or_org.name:"${name.replaceAll('\\', '\\\\')}"`,
              ),
              ' OR ',
            )})`,
            size: '100',
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: { status },
        })

        const actual = yield* Effect.promise(
          _.getPrereviewsForClubFromZenodo(club)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            getPreprintTitle: shouldNotBeCalled,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when a preprint cannot be loaded',
    [fc.clubId(), fc.preprintTitle(), fc.constantFrom(new PreprintIsNotFound({}), new PreprintIsUnavailable({}))],
    ([club, preprint, error]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewsForClubFromZenodo(club)({
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (${Array.join(
                      Array.map(
                        getClubNameAndFormerNames(club),
                        name => `metadata.contributors.person_or_org.name:"${name.replaceAll('\\', '\\\\')}"`,
                      ),
                      ' OR ',
                    )})`,
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint))
                .with('10.1101/2022.02.14.480364', () => TE.left(error))
                .otherwise(() => TE.left(new PreprintIsNotFound({}))),
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(
          E.right([
            new Prereviews.RecentPreprintPrereview({
              club,
              id: 1061864,
              reviewers: { named: ['PREreviewer'], anonymous: 0 },
              fields: [],
              subfields: [],
              published: new Temporal.PlainDate(2022, 7, 4),
              preprint,
            }),
          ]),
        )
      }),
  )

  it.effect.prop(
    'when a review is not part of the club',
    [fc.clubId(), fc.preprintTitle(), fc.preprintTitle()],
    ([club, preprint1, preprint2]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewsForClubFromZenodo(club)({
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND (${Array.join(
                      Array.map(
                        getClubNameAndFormerNames(club),
                        name => `metadata.contributors.person_or_org.name:"${name.replaceAll('\\', '\\\\')}"`,
                      ),
                      ' OR ',
                    )})`,
                    size: '100',
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .fetchHandler(...args),
            getPreprintTitle: id =>
              match(id.value as unknown)
                .with('10.1101/2022.01.13.476201', () => TE.right(preprint1))
                .with('10.1101/2022.02.14.480364', () => TE.right(preprint2))
                .otherwise(() => TE.left(new PreprintIsNotFound({}))),
            clock: SystemClock,
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.right([]))
      }),
  )
})

describe('getPrereviewsForPreprintFromZenodo', () => {
  it.effect.prop(
    'when the PREreviews can be loaded',
    [
      fc.preprintId(),
      fc.option(fc.clubId(), { nil: undefined }),
      fc.oneof(
        fc.constant([0, []]),
        fc.constant([1, [{ name: '1 other author' }]]),
        fc.integer({ min: 2 }).map(number => [number, [{ name: `${number} other authors` }]] as const),
      ),
    ],
    ([preprint, club, [expectedAnonymous, otherAuthors]]) =>
      Effect.gen(function* () {
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

        const actual = yield* Effect.promise(
          _.getPrereviewsForPreprintFromZenodo(preprint)({
            clock: SystemClock,
            fetch: (...args) =>
              fetchMock
                .createInstance()
                .getOnce({
                  url: 'https://zenodo.org/api/communities/prereview-reviews/records',
                  query: {
                    q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
                    sort: 'publication-desc',
                    resource_type: 'publication::publication-peerreview',
                    access_status: 'open',
                  },
                  response: {
                    body: RecordsC.encode(records),
                    status: StatusCodes.OK,
                  },
                })
                .getOnce('http://example.com/review.html/content', { body: 'Some text' })
                .fetchHandler(...args),
            logger: () => IO.of(undefined),
          }),
        )

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
      }),
  )

  it.effect.prop(
    'when the PREreviews cannot be loaded',
    [fc.preprintId(), fc.integer({ min: 400, max: 599 })],
    ([preprint, status]) =>
      Effect.gen(function* () {
        const fetch = fetchMock.createInstance().getOnce({
          url: 'https://zenodo.org/api/communities/prereview-reviews/records',
          query: {
            q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
            sort: 'publication-desc',
            resource_type: 'publication::publication-peerreview',
            access_status: 'open',
          },
          response: { status },
        })

        const actual = yield* Effect.promise(
          _.getPrereviewsForPreprintFromZenodo(preprint)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the review text cannot be loaded',
    [fc.preprintId(), fc.integer({ min: 400, max: 599 })],
    ([preprint, textStatus]) =>
      Effect.gen(function* () {
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
          .createInstance()
          .getOnce({
            url: 'https://zenodo.org/api/communities/prereview-reviews/records',
            query: {
              q: `metadata.related_identifiers.resource_type.id:"publication-preprint" AND related.identifier:"${_.toExternalIdentifier(preprint).identifier}"`,
              sort: 'publication-desc',
              resource_type: 'publication::publication-peerreview',
              access_status: 'open',
            },
            response: {
              body: RecordsC.encode(records),
              status: StatusCodes.OK,
            },
          })
          .getOnce('http://example.com/review.html/content', { status: textStatus })

        const actual = yield* Effect.promise(
          _.getPrereviewsForPreprintFromZenodo(preprint)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            logger: () => IO.of(undefined),
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )
})

describe('addAuthorToRecordOnZenodo', () => {
  describe('when the deposition is submitted', () => {
    it.effect.prop(
      'with a public name',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator],
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
              creators: [creator],
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
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.name, orcid: persona.orcidId }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'with a pseudonym',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.pseudonymPersona(),
        fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator],
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
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.pseudonym }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there are multiple other authors',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
        fc.integer({ min: 3 }),
      ],
      ([zenodoApiKey, id, persona, creator, doi, otherAuthors]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: `${otherAuthors} other authors` }],
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
              creators: [creator, { name: `${otherAuthors} other authors` }],
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
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [
                    creator,
                    { name: persona.name, orcid: persona.orcidId },
                    { name: `${otherAuthors - 1} other authors` },
                  ],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there are 2 other authors',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: '2 other authors' }],
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
              creators: [creator, { name: '2 other authors' }],
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
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.name, orcid: persona.orcidId }, { name: '1 other author' }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )

    it.effect.prop(
      'when there is 1 other author',
      [
        fc.string(),
        fc.integer({ min: 1 }),
        fc.publicPersona(),
        fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        fc.doi(),
      ],
      ([zenodoApiKey, id, persona, creator, doi]) =>
        Effect.gen(function* () {
          const submittedDeposition: SubmittedDeposition = {
            id: 1,
            links: {
              edit: new URL('http://example.com/edit'),
            },
            metadata: {
              creators: [creator, { name: '1 other authors' }],
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
              creators: [creator, { name: '1 other authors' }],
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
            .createInstance()
            .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
              body: SubmittedDepositionC.encode(submittedDeposition),
            })
            .postOnce('http://example.com/edit', {
              body: InProgressDepositionC.encode(inProgressDeposition),
              status: StatusCodes.Created,
            })
            .putOnce({
              url: 'http://example.com/self',
              body: {
                metadata: {
                  creators: [creator, { name: persona.name, orcid: persona.orcidId }],
                  description: 'Description',
                  title: 'Title',
                  upload_type: 'publication',
                  publication_type: 'peerreview',
                },
              },
              response: {
                body: InProgressDepositionC.encode(inProgressDeposition),
                status: StatusCodes.OK,
              },
            })
            .postOnce('http://example.com/publish', {
              body: SubmittedDepositionC.encode(submittedDeposition),
              status: StatusCodes.Accepted,
            })

          const actual = yield* Effect.promise(
            _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
          )

          expect(actual).toStrictEqual(E.right(undefined))
          expect(fetch.callHistory.done()).toBeTruthy()
        }),
    )
  })

  it.effect.prop(
    'when the deposition is not submitted',
    [
      fc.string(),
      fc.integer({ min: 1 }),
      fc.persona(),
      fc.record({ name: fc.string(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
      fc.doi(),
    ],
    ([zenodoApiKey, id, persona, creator, doi]) =>
      Effect.gen(function* () {
        const inProgressDeposition: InProgressDeposition = {
          id: 1,
          links: {
            publish: new URL('http://example.com/publish'),
            self: new URL('http://example.com/self'),
          },
          metadata: {
            creators: [creator],
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

        const fetch = fetchMock.createInstance().getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
          body: InProgressDepositionC.encode(inProgressDeposition),
        })

        const actual = yield* Effect.promise(
          _.addAuthorToRecordOnZenodo(id, persona)({ fetch: (...args) => fetch.fetchHandler(...args), zenodoApiKey }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'Zenodo is unavailable',
    [
      fc.string(),
      fc.integer({ min: 1 }),
      fc.persona(),
      fc.oneof(
        fc
          .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
          .map(response => Promise.resolve(response)),
        fc.error().map(error => Promise.reject(error)),
      ),
    ],
    ([zenodoApiKey, id, persona, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.addAuthorToRecordOnZenodo(
            id,
            persona,
          )({
            fetch: () => response,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('createCommentOnZenodo', () => {
  it.effect.prop(
    'when the comment can be created',
    [
      fc.record({
        author: fc.record({ name: fc.nonEmptyString(), orcid: fc.orcidId() }, { requiredKeys: ['name'] }),
        comment: fc.html(),
        prereview: fc.prereview(),
      }),
      fc.string(),
      fc.origin(),
      fc.doi(),
    ],
    ([comment, zenodoApiKey, publicUrl, commentDoi]) =>
      Effect.gen(function* () {
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
        const fetch = fetchMock
          .createInstance()
          .postOnce({
            url: 'https://zenodo.org/api/deposit/depositions',
            body: {},
            response: {
              body: EmptyDepositionC.encode(emptyDeposition),
              status: StatusCodes.Created,
            },
          })
          .putOnce({
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
            response: {
              body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
              status: StatusCodes.OK,
            },
          })
          .putOnce({
            url: 'http://example.com/bucket/comment.html',
            headers: { 'Content-Type': 'application/octet-stream' },
            matcherFunction: ({ options }) => options.body === comment.comment.toString(),
            response: {
              status: StatusCodes.Created,
            },
          })
        const actual = yield* Effect.promise(
          _.createCommentOnZenodo(comment)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            logger: () => IO.of(undefined),
            publicUrl,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.right([commentDoi, 1]))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'Zenodo is unavailable',
    [
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
    ],
    ([comment, zenodoApiKey, publicUrl, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.createCommentOnZenodo(comment)({
            clock: SystemClock,
            fetch: () => response,
            logger: () => IO.of(undefined),
            publicUrl,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('publishDepositionOnZenodo', () => {
  it.effect.prop(
    'when the deposition can be published',
    [fc.integer(), fc.string(), fc.doi()],
    ([id, zenodoApiKey, depositionDoi]) =>
      Effect.gen(function* () {
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
        const fetch = fetchMock
          .createInstance()
          .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
            body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
            status: StatusCodes.OK,
          })
          .postOnce('http://example.com/publish', {
            body: SubmittedDepositionC.encode(submittedDeposition),
            status: StatusCodes.Accepted,
          })
        const actual = yield* Effect.promise(
          _.publishDepositionOnZenodo(id)({
            clock: SystemClock,
            fetch: (...args) => fetch.fetchHandler(...args),
            logger: () => IO.of(undefined),
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.right(undefined))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'when the deposition is empty',
    [fc.integer(), fc.string(), fc.doi()],
    ([id, zenodoApiKey, depositionDoi]) =>
      Effect.gen(function* () {
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
        const fetch = fetchMock.createInstance()
        const actual = yield* Effect.promise(
          _.publishDepositionOnZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetch
                .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
                  body: EmptyDepositionC.encode(emptyDeposition),
                  status: StatusCodes.OK,
                })
                .fetchHandler(...args),
            logger: () => IO.of(undefined),
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )
  it.effect.prop(
    'when the deposition is submitted',
    [fc.integer(), fc.string(), fc.doi()],
    ([id, zenodoApiKey, depositionDoi]) =>
      Effect.gen(function* () {
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
        const fetch = fetchMock.createInstance()
        const actual = yield* Effect.promise(
          _.publishDepositionOnZenodo(id)({
            clock: SystemClock,
            fetch: (...args) =>
              fetch
                .getOnce(`https://zenodo.org/api/deposit/depositions/${id}`, {
                  body: SubmittedDepositionC.encode(submittedDeposition),
                  status: StatusCodes.OK,
                })
                .fetchHandler(...args),
            logger: () => IO.of(undefined),
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
        expect(fetch.callHistory.done()).toBeTruthy()
      }),
  )

  it.effect.prop(
    'Zenodo is unavailable',
    [
      fc.integer(),
      fc.string(),
      fc.oneof(
        fc
          .fetchResponse({ status: fc.statusCode().filter(status => status >= 400) })
          .map(response => Promise.resolve(response)),
        fc.error().map(error => Promise.reject(error)),
      ),
    ],
    ([id, zenodoApiKey, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.publishDepositionOnZenodo(id)({
            clock: SystemClock,
            fetch: () => response,
            logger: () => IO.of(undefined),
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('createRecordOnZenodo', () => {
  describe('as a public persona', () => {
    it.effect.prop(
      'with a PREreview',
      [
        fc.record<NewPrereview>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
          persona: fc.publicPersona(),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(false),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.string() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const getPreprintSubjects = vi.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(_ => T.of(subjects))
          const isReviewRequested = vi.fn<_.IsReviewRequestedEnv['isReviewRequested']>(_ => TE.right(requested))

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
              creators: [
                {
                  name: (newPrereview.persona as Personas.PublicPersona).name,
                  orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
                },
              ],
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
              creators: [
                {
                  name: (newPrereview.persona as Personas.PublicPersona).name,
                  orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
                },
              ],
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

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          {
                            name: (newPrereview.persona as Personas.PublicPersona).name,
                            orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
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
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
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
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects,
              isReviewRequested,
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
          expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
          expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
        }),
    )

    it.effect.prop(
      'with a Structured PREreview',
      [
        fc.record<NewPrereview>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
          persona: fc.publicPersona(),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(true),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.string() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
          const getPreprintSubjects = vi.fn<_.GetPreprintSubjectsEnv['getPreprintSubjects']>(_ => T.of(subjects))
          const isReviewRequested = vi.fn<_.IsReviewRequestedEnv['isReviewRequested']>(_ => TE.right(requested))

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
              creators: [
                {
                  name: (newPrereview.persona as Personas.PublicPersona).name,
                  orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
                },
              ],
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
              creators: [
                {
                  name: (newPrereview.persona as Personas.PublicPersona).name,
                  orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
                },
              ],
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

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          {
                            name: (newPrereview.persona as Personas.PublicPersona).name,
                            orcid: (newPrereview.persona as Personas.PublicPersona).orcidId,
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
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
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
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects,
              isReviewRequested,
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
          expect(getPreprintSubjects).toHaveBeenCalledWith(newPrereview.preprint.id)
          expect(isReviewRequested).toHaveBeenCalledWith(newPrereview.preprint.id)
        }),
    )
  })

  describe('as an pseudonym persona', () => {
    it.effect.prop(
      'with a PREreview',
      [
        fc.record<NewPrereview>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
          persona: fc.pseudonymPersona(),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(false),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.string() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
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

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          { name: (newPrereview.persona as Personas.PseudonymPersona).pseudonym },
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
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
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
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects: () => T.of(subjects),
              isReviewRequested: () => TE.right(requested),
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
        }),
    )

    it.effect.prop(
      'with a Structured PREreview',
      [
        fc.record<NewPrereview>({
          conduct: fc.constant('yes'),
          otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
          persona: fc.pseudonymPersona(),
          preprint: fc.preprintTitle(),
          review: fc.html(),
          language: fc.maybe(fc.languageCode()),
          license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
          locale: fc.supportedLocale(),
          structured: fc.constant(true),
          user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
        }),
        fc.array(fc.record({ id: fc.url(), name: fc.string() })),
        fc.boolean(),
        fc.string(),
        fc.origin(),
        fc.doi(),
      ],
      ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, reviewDoi]) =>
        Effect.gen(function* () {
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

          const actual = yield* Effect.promise(
            _.createRecordOnZenodo(newPrereview)({
              clock: SystemClock,
              fetch: (...args) =>
                fetchMock
                  .createInstance()
                  .postOnce({
                    url: 'https://zenodo.org/api/deposit/depositions',
                    body: {},
                    response: {
                      body: EmptyDepositionC.encode(emptyDeposition),
                      status: StatusCodes.Created,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/self',
                    body: {
                      metadata: {
                        upload_type: 'publication',
                        publication_type: 'peerreview',
                        title: plainText`Structured PREreview of “${newPrereview.preprint.title}”`.toString(),
                        creators: [
                          { name: (newPrereview.persona as Personas.PseudonymPersona).pseudonym },
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
                          ? {
                              subjects: subjects.map(({ id, name }) => ({
                                term: name,
                                identifier: id.href,
                                scheme: 'url',
                              })),
                            }
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
                    response: {
                      body: UnsubmittedDepositionC.encode(unsubmittedDeposition),
                      status: StatusCodes.OK,
                    },
                  })
                  .putOnce({
                    url: 'http://example.com/bucket/review.html',
                    headers: { 'Content-Type': 'application/octet-stream' },
                    matcherFunction: ({ options }) => options.body === newPrereview.review.toString(),
                    response: {
                      status: StatusCodes.Created,
                    },
                  })
                  .postOnce('http://example.com/publish', {
                    body: SubmittedDepositionC.encode(submittedDeposition),
                    status: StatusCodes.Accepted,
                  })
                  .fetchHandler(...args),
              getPreprintSubjects: () => T.of(subjects),
              isReviewRequested: () => TE.right(requested),
              logger: () => IO.of(undefined),
              publicUrl,
              zenodoApiKey,
            }),
          )

          expect(actual).toStrictEqual(E.right([reviewDoi, 1]))
        }),
    )
  })

  it.effect.prop(
    'Zenodo is unavailable',
    [
      fc.record<NewPrereview>({
        conduct: fc.constant('yes'),
        otherAuthors: fc.array(fc.record({ name: fc.nonEmptyString(), emailAddress: fc.emailAddress() })),
        persona: fc.persona(),
        preprint: fc.preprintTitle(),
        review: fc.html(),
        language: fc.maybe(fc.languageCode()),
        license: fc.constantFrom('CC-BY-4.0', 'CC0-1.0'),
        locale: fc.supportedLocale(),
        structured: fc.boolean(),
        user: fc.record({ orcidId: fc.orcidId(), pseudonym: fc.pseudonym() }),
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
    ],
    ([newPrereview, subjects, requested, zenodoApiKey, publicUrl, response]) =>
      Effect.gen(function* () {
        const actual = yield* Effect.promise(
          _.createRecordOnZenodo(newPrereview)({
            clock: SystemClock,
            fetch: () => response,
            getPreprintSubjects: () => T.of(subjects),
            isReviewRequested: () => TE.right(requested),
            logger: () => IO.of(undefined),
            publicUrl,
            zenodoApiKey,
          }),
        )

        expect(actual).toStrictEqual(E.left('unavailable'))
      }),
  )
})

describe('toExternalIdentifier', () => {
  it.prop('with a DOI preprint ID', [fc.preprintIdWithDoi()], ([preprintId]) => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'doi',
      identifier: preprintId.value,
    })
  })

  it.prop('with a PhilSci preprint ID', [fc.philsciPreprintId()], ([preprintId]) => {
    expect(_.toExternalIdentifier(preprintId)).toStrictEqual({
      scheme: 'url',
      identifier: `https://philsci-archive.pitt.edu/${preprintId.value}/`,
    })
  })
})
