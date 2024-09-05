import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi, toUrl } from 'doi-ts'
import * as _ from '../src/sciety.js'
import * as fc from './fc.js'

describe('isScietyPreprint', () => {
  test.prop([
    fc.oneof(
      fc.africarxivOsfPreprintId(),
      fc.biorxivPreprintId(),
      fc.edarxivPreprintId(),
      fc.medrxivPreprintId(),
      fc.metaarxivPreprintId(),
      fc.osfPreprintsPreprintId(),
      fc.psyarxivPreprintId(),
      fc.researchSquarePreprintId(),
      fc.scieloPreprintId(),
      fc.socarxivPreprintId(),
    ),
  ])('with a Sciety preprint ID', preprintId => {
    expect(_.isScietyPreprint(preprintId)).toBeTruthy()
  })

  test.prop([
    fc.oneof(
      fc.africarxivFigsharePreprintId(),
      fc.africarxivZenodoPreprintId(),
      fc.arxivPreprintId(),
      fc.authoreaPreprintId(),
      fc.chemrxivPreprintId(),
      fc.eartharxivPreprintId(),
      fc.ecoevorxivPreprintId(),
      fc.engrxivPreprintId(),
      fc.philsciPreprintId(),
      fc.preprintsorgPreprintId(),
      fc.scienceOpenPreprintId(),
      fc.zenodoPreprintId(),
    ),
  ])('with a non-Sciety preprint ID', preprintId => {
    expect(_.isScietyPreprint(preprintId)).toBeFalsy()
  })
})

test.prop(
  [
    fc
      .oneof(
        fc.africarxivOsfPreprintId(),
        fc.biorxivPreprintId(),
        fc.edarxivPreprintId(),
        fc.medrxivPreprintId(),
        fc.metaarxivPreprintId(),
        fc.osfPreprintsPreprintId(),
        fc.psyarxivPreprintId(),
        fc.researchSquarePreprintId(),
        fc.scieloPreprintId(),
        fc.socarxivPreprintId(),
      )
      .map(preprint => [preprint, `https://sciety.org/articles/activity${toUrl(preprint.value).pathname}`] as const),
  ],
  {
    examples: [
      [
        [
          { type: 'biorxiv', value: Doi('10.1101/journal/pone.0011111') } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/journal/pone.0011111',
        ],
      ],
      [
        [
          { type: 'biorxiv', value: Doi('10.1101/456#789') } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/456%23789',
        ],
      ],
      [
        [
          {
            type: 'biorxiv',
            value: Doi('10.1101/(SICI)1096-8644(199808)106:4<483::AID-AJPA4>3.0.CO;2-K'),
          } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/(SICI)1096-8644(199808)106:4%3C483::AID-AJPA4%3E3.0.CO;2-K',
        ],
      ],
      [
        [
          { type: 'biorxiv', value: Doi('10.1101/./') } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/.%2F',
        ],
      ],
      [
        [
          { type: 'biorxiv', value: Doi('10.1101/../') } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/..%2F',
        ],
      ],
      [
        [
          { type: 'biorxiv', value: Doi('10.1101/\\') } as _.PreprintIdSupportedBySciety,
          'https://sciety.org/articles/activity/10.1101/%5C',
        ],
      ],
    ],
  },
)('scietyUrl', ([doi, url]) => {
  expect(_.scietyUrl(doi).href).toStrictEqual(url)
})
