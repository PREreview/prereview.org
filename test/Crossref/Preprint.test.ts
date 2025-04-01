import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Either } from 'effect'
import { Orcid } from 'orcid-id-ts'
import * as _ from '../../src/Crossref/Preprint.js'
import { Work } from '../../src/Crossref/Work.js'
import { rawHtml } from '../../src/html.js'
import { Preprint } from '../../src/preprint.js'
import { Doi } from '../../src/types/Doi.js'
import * as fc from '../fc.js'

describe('workToPreprint', () => {
  test.each([
    {
      work: new Work({
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
      work: new Work({
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
          { given: 'Nadia', family: 'Blostein', ORCID: Orcid('0000-0002-1864-1899') },
          { given: 'Nikola', family: 'Stikov', ORCID: Orcid('0000-0002-8480-5230') },
        ],
        published: Temporal.PlainDate.from({ year: 2024, month: 12, day: 15 }),
        'group-title': 'NeuroLibre Reproducible Preprints',
        type: 'posted-content',
        subtype: 'preprint',
      }),
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
  ])('can be transformed ($work.DOI)', ({ work, expected }) => {
    const actual = Either.getOrThrow(_.workToPreprint(work))

    expect(actual).toStrictEqual(expected)
  })

  test.prop([fc.lorem(), fc.option(fc.lorem(), { nil: undefined })], {
    examples: [
      ['journal-article', undefined],
      ['posted-content', undefined],
      ['posted-content', 'dissertation'],
      ['posted-content', 'other'],
    ],
  })('not a preprint', (type, subtype) => {
    const work = new Work({
      ...stubWork,
      type,
      subtype,
    })

    const actual = Either.getOrThrow(Either.flip(_.workToPreprint(work)))

    expect(actual._tag).toStrictEqual('NotAPreprint')
    expect(actual.cause).toStrictEqual({ type, subtype })
  })

  test.prop([fc.oneof(fc.datacitePreprintDoi(), fc.japanLinkCenterPreprintDoi(), fc.nonPreprintDoi())])(
    'not a Crossref preprint ID',
    doi => {
      const work = new Work({
        ...stubWork,
        DOI: doi,
      })

      const actual = Either.getOrThrow(Either.flip(_.workToPreprint(work)))

      expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
      expect(actual.cause).toStrictEqual(doi)
    },
  )

  test('no authors', () => {
    const work = new Work({
      ...stubWork,
      author: [],
    })

    const actual = Either.getOrThrow(Either.flip(_.workToPreprint(work)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual({ author: [] })
  })

  test('no title', () => {
    const work = new Work({
      ...stubWork,
      title: [],
    })

    const actual = Either.getOrThrow(Either.flip(_.workToPreprint(work)))

    expect(actual._tag).toStrictEqual('PreprintIsUnavailable')
    expect(actual.cause).toStrictEqual({ title: [] })
  })
})

const stubWork = {
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
} satisfies typeof Work.Type
