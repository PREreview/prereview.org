import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
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
    response: 'ssrn.json',
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
    response: 'neurolibre.json',
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
  {
    response: 'biorxiv.json',
    expected: Preprint({
      authors: [
        {
          name: 'Sydney L Miles',
          orcid: Orcid('0000-0003-2291-4105'),
        },
        {
          name: 'Dilys Santillo',
          orcid: Orcid('0009-0004-3966-4952'),
        },
        {
          name: 'Vincenzo Torraca',
          orcid: Orcid('0000-0001-7340-0249'),
        },
        {
          name: 'Ana Teresa López Jiménez',
          orcid: Orcid('0000-0002-0289-738X'),
        },
        {
          name: 'Claire Jenkins',
          orcid: Orcid('0000-0001-8600-9169'),
        },
        {
          name: 'Stephen Baker',
          orcid: Orcid('0000-0003-1308-5755'),
        },
        {
          name: 'Kate S Baker',
          orcid: Orcid('0000-0001-5850-1949'),
        },
        {
          name: 'Vanessa Sancho-Shimizu',
          orcid: Orcid('0000-0002-3519-0727'),
        },
        {
          name: 'Kathryn E Holt',
          orcid: Orcid('0000-0003-3949-2471'),
        },
        {
          name: 'Serge Mostowy',
          orcid: Orcid('0000-0002-7286-6503'),
        },
      ],
      id: { type: 'biorxiv', value: Doi('10.1101/2025.02.05.636615') },
      posted: Temporal.PlainDate.from({ year: 2025, month: 2, day: 5 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Enhanced virulence and stress tolerance are signatures of epidemiologically successful&lt;i&gt;Shigella sonnei&lt;/i&gt;',
        ),
      },
      url: new URL('http://biorxiv.org/lookup/doi/10.1101/2025.02.05.636615'),
    }),
  },
])('turns a Crossref work response into a preprint ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/Crossref/WorkSamples/${response}`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Work)))),
      Effect.andThen(Struct.get('message')),
      Effect.andThen(workToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
