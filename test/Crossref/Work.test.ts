import { HttpClient, type HttpClientError, HttpClientRequest, HttpClientResponse } from '@effect/platform'
import { test } from '@fast-check/jest'
import { describe, expect, jest } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Tuple } from 'effect'
import * as _ from '../../src/Crossref/Work.js'
import * as EffectTest from '../EffectTest.js'
import * as fc from '../fc.js'

describe('getWork', () => {
  test.prop(
    [fc.doi().map(doi => Tuple.make(doi, new URL(encodeURIComponent(doi), 'https://api.crossref.org/works/').href))],
    {
      examples: [
        [[Doi('10.2139/ssrn.5186959'), 'https://api.crossref.org/works/10.2139%2Fssrn.5186959']],
        [
          [
            Doi('10.1002/(SICI)1521-3951(199911)216:1<135::AID-PSSB135>3.0.CO;2-#'),
            'https://api.crossref.org/works/10.1002%2F(SICI)1521-3951(199911)216%3A1%3C135%3A%3AAID-PSSB135%3E3.0.CO%3B2-%23',
          ],
        ],
      ],
    },
  )('calls the work API', ([doi, expectedUrl]) =>
    Effect.gen(function* () {
      const clientSpy = jest.fn((_: HttpClientRequest.HttpClientRequest) => new Response())
      const client = stubbedClient(clientSpy)

      yield* pipe(Effect.flip(_.getWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

      expect(clientSpy).toHaveBeenCalledWith(HttpClientRequest.get(expectedUrl))
    }).pipe(EffectTest.run),
  )

  describe('with a response', () => {
    describe('with a 200 status code', () => {
      describe('with a work', () => {
        test.each([
          [
            Doi('10.2139/ssrn.5186959'),
            {
              status: 'ok',
              'message-type': 'work',
              'message-version': '1.0.0',
              message: {
                indexed: {
                  'date-parts': [[2025, 3, 27]],
                  'date-time': '2025-03-27T01:40:24Z',
                  timestamp: 1743039624967,
                  version: '3.40.3',
                },
                posted: { 'date-parts': [[2025]] },
                'group-title': 'SSRN',
                'reference-count': 0,
                publisher: 'Elsevier BV',
                'content-domain': { domain: [], 'crossmark-restriction': false },
                'short-container-title': [],
                DOI: '10.2139/ssrn.5186959',
                type: 'posted-content',
                created: {
                  'date-parts': [[2025, 3, 27]],
                  'date-time': '2025-03-27T01:15:43Z',
                  timestamp: 1743038143000,
                },
                source: 'Crossref',
                'is-referenced-by-count': 0,
                title: [
                  'Enhanced Flavoprotein Autofluorescence Imaging in Rats Using a Combination of Thin Skull Window and Skull-Clearing Reagents',
                ],
                prefix: '10.2139',
                author: [
                  { given: 'Kazuaki', family: 'Nagasaka', sequence: 'first', affiliation: [] },
                  { given: 'Yuto', family: 'Ogawa', sequence: 'additional', affiliation: [] },
                  { given: 'Daisuke', family: 'Ishii', sequence: 'additional', affiliation: [] },
                  { given: 'Ayane', family: 'Nagao', sequence: 'additional', affiliation: [] },
                  { given: 'Hitomi', family: 'Ikarashi', sequence: 'additional', affiliation: [] },
                  { given: 'Naofumi', family: 'Otsuru', sequence: 'additional', affiliation: [] },
                  { given: 'Hideaki', family: 'Onishi', sequence: 'additional', affiliation: [] },
                ],
                member: '78',
                'container-title': [],
                'original-title': [],
                deposited: {
                  'date-parts': [[2025, 3, 27]],
                  'date-time': '2025-03-27T01:15:43Z',
                  timestamp: 1743038143000,
                },
                score: 1,
                resource: { primary: { URL: 'https://www.ssrn.com/abstract=5186959' } },
                subtitle: [],
                'short-title': [],
                issued: { 'date-parts': [[2025]] },
                'references-count': 0,
                URL: 'https://doi.org/10.2139/ssrn.5186959',
                relation: {},
                subject: [],
                published: { 'date-parts': [[2025]] },
                subtype: 'preprint',
              },
            },
            new _.Work({
              DOI: Doi('10.2139/ssrn.5186959'),
              resource: {
                primary: {
                  URL: new URL('https://www.ssrn.com/abstract=5186959'),
                },
              },
              title: [
                'Enhanced Flavoprotein Autofluorescence Imaging in Rats Using a Combination of Thin Skull Window and Skull-Clearing Reagents',
              ],
              author: [
                { given: 'Kazuaki', family: 'Nagasaka' },
                { given: 'Yuto', family: 'Ogawa' },
                { given: 'Daisuke', family: 'Ishii' },
                { given: 'Ayane', family: 'Nagao' },
                { given: 'Hitomi', family: 'Ikarashi' },
                { given: 'Naofumi', family: 'Otsuru' },
                { given: 'Hideaki', family: 'Onishi' },
              ],
              published: 2025,
              'group-title': 'SSRN',
              type: 'posted-content',
              subtype: 'preprint',
            }),
          ],
          [
            Doi('10.55458/neurolibre.00031'),
            {
              status: 'ok',
              'message-type': 'work',
              'message-version': '1.0.0',
              message: {
                indexed: {
                  'date-parts': [[2024, 12, 15]],
                  'date-time': '2024-12-15T22:10:02Z',
                  timestamp: 1734300602836,
                  version: '3.30.2',
                },
                posted: { 'date-parts': [[2024, 12, 15]] },
                'group-title': 'NeuroLibre Reproducible Preprints',
                'reference-count': 21,
                publisher: "Centre de Recherche de l'Institut Universitaire de Geriatrie de Montreal",
                license: [
                  {
                    start: {
                      'date-parts': [[2024, 12, 15]],
                      'date-time': '2024-12-15T00:00:00Z',
                      timestamp: 1734220800000,
                    },
                    'content-version': 'vor',
                    'delay-in-days': 0,
                    URL: 'http://creativecommons.org/licenses/by/4.0/',
                  },
                  {
                    start: {
                      'date-parts': [[2024, 12, 15]],
                      'date-time': '2024-12-15T00:00:00Z',
                      timestamp: 1734220800000,
                    },
                    'content-version': 'am',
                    'delay-in-days': 0,
                    URL: 'http://creativecommons.org/licenses/by/4.0/',
                  },
                  {
                    start: {
                      'date-parts': [[2024, 12, 15]],
                      'date-time': '2024-12-15T00:00:00Z',
                      timestamp: 1734220800000,
                    },
                    'content-version': 'tdm',
                    'delay-in-days': 0,
                    URL: 'http://creativecommons.org/licenses/by/4.0/',
                  },
                ],
                'content-domain': { domain: [], 'crossmark-restriction': false },
                'short-container-title': [],
                DOI: '10.55458/neurolibre.00031',
                type: 'posted-content',
                created: {
                  'date-parts': [[2024, 12, 15]],
                  'date-time': '2024-12-15T21:32:39Z',
                  timestamp: 1734298359000,
                },
                source: 'Crossref',
                'is-referenced-by-count': 0,
                title: ['Little Science, Big Science, and Beyond: How Amateurs\nShape the Scientific Landscape'],
                prefix: '10.55458',
                author: [
                  { given: 'Evelyn', family: 'McLean', sequence: 'first', affiliation: [] },
                  { given: 'Jane', family: 'Abdo', sequence: 'additional', affiliation: [] },
                  {
                    ORCID: 'https://orcid.org/0000-0002-1864-1899',
                    'authenticated-orcid': false,
                    given: 'Nadia',
                    family: 'Blostein',
                    sequence: 'additional',
                    affiliation: [],
                  },
                  {
                    ORCID: 'https://orcid.org/0000-0002-8480-5230',
                    'authenticated-orcid': false,
                    given: 'Nikola',
                    family: 'Stikov',
                    sequence: 'additional',
                    affiliation: [],
                  },
                ],
                member: '34163',
                reference: [
                  {
                    key: 'vesalius1543humani',
                    'volume-title': 'De humani corporis fabrica libri\nseptem',
                    author: 'Vesalius',
                    year: '1543',
                    unstructured: 'Vesalius, A. (1543). De humani\ncorporis fabrica libri septem.',
                  },
                ],
                'container-title': [],
                'original-title': [],
                link: [
                  {
                    URL: 'https://preprint.neurolibre.org/10.55458/neurolibre.00031.pdf',
                    'content-type': 'application/pdf',
                    'content-version': 'vor',
                    'intended-application': 'text-mining',
                  },
                ],
                deposited: {
                  'date-parts': [[2024, 12, 15]],
                  'date-time': '2024-12-15T21:32:41Z',
                  timestamp: 1734298361000,
                },
                score: 1,
                resource: { primary: { URL: 'https://neurolibre.org/papers/10.55458/neurolibre.00031' } },
                subtitle: [],
                'short-title': [],
                issued: { 'date-parts': [[2024, 12, 15]] },
                'references-count': 21,
                URL: 'https://doi.org/10.55458/neurolibre.00031',
                relation: {
                  'is-supplemented-by': [
                    { 'id-type': 'doi', id: '10.5281/zenodo.14348880', 'asserted-by': 'subject' },
                    { 'id-type': 'doi', id: '10.5281/zenodo.14348882', 'asserted-by': 'subject' },
                    { 'id-type': 'doi', id: '10.5281/zenodo.14348876', 'asserted-by': 'subject' },
                    { 'id-type': 'doi', id: '10.5281/zenodo.14348886', 'asserted-by': 'subject' },
                    {
                      'id-type': 'uri',
                      id: 'https://github.com/neurolibre/neurolibre-reviews/issues/31',
                      'asserted-by': 'subject',
                    },
                    {
                      'id-type': 'uri',
                      id: 'https://preprint.neurolibre.org/10.55458/neurolibre.00031',
                      'asserted-by': 'subject',
                    },
                  ],
                },
                subject: [],
                published: { 'date-parts': [[2024, 12, 15]] },
                subtype: 'preprint',
              },
            },
            new _.Work({
              DOI: Doi('10.55458/neurolibre.00031'),
              resource: {
                primary: {
                  URL: new URL('https://neurolibre.org/papers/10.55458/neurolibre.00031'),
                },
              },
              title: ['Little Science, Big Science, and Beyond: How Amateurs\nShape the Scientific Landscape'],
              author: [
                { given: 'Evelyn', family: 'McLean' },
                { given: 'Jane', family: 'Abdo' },
                { given: 'Nadia', family: 'Blostein' },
                { given: 'Nikola', family: 'Stikov' },
              ],
              published: Temporal.PlainDate.from({ year: 2024, month: 12, day: 15 }),
              'group-title': 'NeuroLibre Reproducible Preprints',
              type: 'posted-content',
              subtype: 'preprint',
            }),
          ],
          [
            Doi('10.1002/ppp.v29.3'),
            {
              status: 'ok',
              'message-type': 'work',
              'message-version': '1.0.0',
              message: {
                indexed: {
                  'date-parts': [[2023, 9, 18]],
                  'date-time': '2023-09-18T04:15:51Z',
                  timestamp: 1695010551638,
                },
                'reference-count': 0,
                publisher: 'Wiley',
                issue: '3',
                'content-domain': { domain: [], 'crossmark-restriction': false },
                'short-container-title': ['Permafrost &amp; Periglacial'],
                'published-print': { 'date-parts': [[2018, 7]] },
                DOI: '10.1002/ppp.v29.3',
                type: 'journal-issue',
                created: {
                  'date-parts': [[2018, 8, 2]],
                  'date-time': '2018-08-02T05:35:35Z',
                  timestamp: 1533188135000,
                },
                source: 'Crossref',
                'is-referenced-by-count': 0,
                title: [],
                prefix: '10.1002',
                volume: '29',
                member: '311',
                'container-title': ['Permafrost and Periglacial Processes'],
                'original-title': [],
                language: 'en',
                deposited: {
                  'date-parts': [[2023, 9, 17]],
                  'date-time': '2023-09-17T21:04:06Z',
                  timestamp: 1694984646000,
                },
                score: 1,
                resource: { primary: { URL: 'https://onlinelibrary.wiley.com/toc/10991530/29/3' } },
                subtitle: [],
                'short-title': [],
                issued: { 'date-parts': [[2018, 7]] },
                'references-count': 0,
                'journal-issue': { issue: '3', 'published-print': { 'date-parts': [[2018, 7]] } },
                URL: 'https://doi.org/10.1002/ppp.v29.3',
                relation: {},
                ISSN: ['1045-6740', '1099-1530'],
                'issn-type': [
                  { value: '1045-6740', type: 'print' },
                  { value: '1099-1530', type: 'electronic' },
                ],
                subject: [],
                published: { 'date-parts': [[2018, 7]] },
              },
            },
            new _.Work({
              DOI: Doi('10.1002/ppp.v29.3'),
              resource: {
                primary: {
                  URL: new URL('https://onlinelibrary.wiley.com/toc/10991530/29/3'),
                },
              },
              title: [],
              author: [],
              published: Temporal.PlainYearMonth.from({ year: 2018, month: 7 }),
              type: 'journal-issue',
            }),
          ],
        ])('returns the work (%s)', (doi, work, expected) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(JSON.stringify(work), { status: 200 }))

            const actual = yield* pipe(_.getWork(doi), Effect.provideService(HttpClient.HttpClient, client))

            expect(actual).toStrictEqual(expected)
          }).pipe(EffectTest.run),
        )
      })

      describe('with a unknown body', () => {
        test.prop([fc.doi(), fc.string()])('returns an error', (doi, body) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(body, { status: 200 }))

            const actual = yield* pipe(
              Effect.flip(_.getWork(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toStrictEqual(
              expect.objectContaining({ _tag: expect.stringMatching(/^ParseError|ResponseError$/) }),
            )
          }).pipe(EffectTest.run),
        )
      })
    })

    describe('with a 404 status code', () => {
      test.prop([fc.doi()])('always fails', doi =>
        Effect.gen(function* () {
          const client = stubbedClient(() => new Response(null, { status: 404 }))

          const actual = yield* pipe(Effect.flip(_.getWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

          expect(actual._tag).toStrictEqual('WorkIsNotFound')
          expect(actual.cause).toStrictEqual(expect.objectContaining({ status: 404 }))
        }).pipe(EffectTest.run),
      )
    })

    describe('with another status code', () => {
      test.prop([fc.doi(), fc.statusCode().filter(status => status >= 201 && status !== 404)])(
        'with another status code',
        (doi, status) =>
          Effect.gen(function* () {
            const client = stubbedClient(() => new Response(null, { status }))

            const actual = yield* pipe(
              Effect.flip(_.getWork(doi)),
              Effect.provideService(HttpClient.HttpClient, client),
            )

            expect(actual._tag).toStrictEqual('WorkIsUnavailable')
            expect(actual.cause).toStrictEqual(expect.objectContaining({ status }))
          }).pipe(EffectTest.run),
      )
    })
  })

  describe('with a request error', () => {
    test.prop([fc.doi(), fc.httpClientRequestError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.getWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('WorkIsUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })

  describe('with a response error', () => {
    test.prop([fc.doi(), fc.httpClientResponseError()])('returns unavailable', (doi, error) =>
      Effect.gen(function* () {
        const client = stubbedFailingClient(() => error)
        const actual = yield* pipe(Effect.flip(_.getWork(doi)), Effect.provideService(HttpClient.HttpClient, client))

        expect(actual._tag).toStrictEqual('WorkIsUnavailable')
        expect(actual.cause).toStrictEqual(error)
      }).pipe(EffectTest.run),
    )
  })
})

const stubbedClient = (f: (request: HttpClientRequest.HttpClientRequest) => Response) =>
  HttpClient.makeWith<never, never, never, never>(
    Effect.andThen(request => HttpClientResponse.fromWeb(request, f(request))),
    Effect.succeed,
  )

const stubbedFailingClient = (f: (request: HttpClientRequest.HttpClientRequest) => HttpClientError.HttpClientError) =>
  HttpClient.makeWith<never, never, HttpClientError.HttpClientError, never>(
    Effect.andThen(request => Effect.fail(f(request))),
    Effect.succeed,
  )
