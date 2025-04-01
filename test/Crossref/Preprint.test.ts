import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import * as _ from '../../src/Crossref/Preprint.js'
import { Work } from '../../src/Crossref/Work.js'
import { Doi } from '../../src/types/Doi.js'
import * as fc from '../fc.js'

describe('isWorkAPreprint', () => {
  test('with a preprint', () => {
    const work = new Work({
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
    })

    expect(_.isWorkAPreprint(work)).toBeTruthy()
  })

  test.prop([fc.lorem(), fc.option(fc.lorem(), { nil: undefined })], {
    examples: [
      ['journal-article', undefined],
      ['posted-content', undefined],
      ['posted-content', 'dissertation'],
      ['posted-content', 'other'],
    ],
  })('with a non-preprint', (type, subtype) => {
    const work = new Work({
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
      type,
      subtype,
    })

    expect(_.isWorkAPreprint(work)).toBeFalsy()
  })
})
