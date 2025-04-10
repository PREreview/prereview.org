import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Struct } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { workToPreprint } from '../../src/Crossref/Preprint.js'
import { ResponseSchema, Work } from '../../src/Crossref/Work.js'
import { rawHtml } from '../../src/html.js'
import { Preprint } from '../../src/preprint.js'
import * as EffectTest from '../EffectTest.js'

test.each([
  {
    response: {
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

    expected: Preprint({
      authors: [
        { name: 'Kazuaki Nagasaka', orcid: undefined },
        { name: 'Yuto Ogawa', orcid: undefined },
        { name: 'Daisuke Ishii', orcid: undefined },
        { name: 'Ayane Nagao', orcid: undefined },
        { name: 'Hitomi Ikarashi', orcid: undefined },
        { name: 'Naofumi Otsuru', orcid: undefined },
        { name: 'Hideaki Onishi', orcid: undefined },
      ],
      id: { type: 'ssrn', value: Doi('10.2139/ssrn.5186959') },
      posted: 2025,
      title: {
        language: 'en',
        text: rawHtml(
          'Enhanced Flavoprotein Autofluorescence Imaging in Rats Using a Combination of Thin Skull Window and Skull-Clearing Reagents',
        ),
      },
      url: new URL('https://www.ssrn.com/abstract=5186959'),
    }),
  },
  {
    response: {
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
    expected: Preprint({
      authors: [
        { name: 'Evelyn McLean', orcid: undefined },
        { name: 'Jane Abdo', orcid: undefined },
        { name: 'Nadia Blostein', orcid: Orcid('0000-0002-1864-1899') },
        { name: 'Nikola Stikov', orcid: Orcid('0000-0002-8480-5230') },
      ],
      id: { type: 'neurolibre', value: Doi('10.55458/neurolibre.00031') },
      posted: Temporal.PlainDate.from({ year: 2024, month: 12, day: 15 }),
      title: {
        language: 'en',
        text: rawHtml('Little Science, Big Science, and Beyond: How Amateurs\nShape the Scientific Landscape'),
      },
      url: new URL('https://neurolibre.org/papers/10.55458/neurolibre.00031'),
    }),
  },
])('turns a Crossref work response into a preprint ($response.message.DOI)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      response,
      Schema.decodeUnknown(ResponseSchema(Work)),
      Effect.andThen(Struct.get('message')),
      Effect.andThen(workToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(EffectTest.run),
)
