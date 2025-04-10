import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Either } from 'effect'
import * as _ from '../../src/Crossref/Preprint.js'
import { Work } from '../../src/Crossref/Work.js'
import { Doi } from '../../src/types/Doi.js'
import * as fc from '../fc.js'

describe('workToPreprint', () => {
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
