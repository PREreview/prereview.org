import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option, Tuple } from 'effect'
import * as _ from '../../src/Datasets/DatasetId.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { Doi } from '../../src/types/index.ts'
import * as fc from '../fc.ts'

describe('isDatasetDoi', () => {
  test.prop([fc.datasetDoi()])('with a dataset DOI', doi => {
    const actual = _.isDatasetDoi(doi)

    expect(actual).toBeTruthy()
  })

  test.prop([fc.oneof(fc.doi(fc.constantFrom('0001', '1', '123', '1000')), fc.nonDatasetDoi())])(
    'with a non-dataset DOI',
    doi => {
      const actual = _.isDatasetDoi(doi)

      expect(actual).toBeFalsy()
    },
  )
})

describe('parseDatasetDoi', () => {
  test.prop([fc.datasetId().map(id => Tuple.make(id.value, id))])('with a dataset DOI', ([doi, expected]) => {
    const actual = _.parseDatasetDoi(doi)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.prop([fc.oneof(fc.doi(fc.constantFrom('0001', '1', '123', '1000')), fc.nonDatasetDoi())])(
    'with a non-dataset DOI',
    doi => {
      const actual = _.parseDatasetDoi(doi)

      expect(actual).toStrictEqual(Option.none())
    },
  )
})

describe('fromUrl', () => {
  test.prop([fc.datasetId().map(id => [Doi.toUrl(id.value), id] as const)], {
    examples: [
      [
        [
          new URL('https://doi.org/10.5061/dryad.wstqjq2n3'),
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('http://doi.org/10.5061/dryad.wstqjq2n3'), // http
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('https://dx.doi.org/10.5061/dryad.wstqjq2n3'), // dx.doi.org
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('http://dx.doi.org/10.5061/dryad.wstqjq2n3'), // http dx.doi.org
          new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
    ],
  })('with a doi.org URL', ([url, expected]) => {
    const actual = _.fromUrl(url)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  test.prop([fc.dryadDatasetUrl()], {
    examples: [
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
          new _.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('https://www.datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'), // www.
          new _.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('http://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'), // http
          new _.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3/'), // trailing slash
          new _.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.6071/M3238R'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.6071/M3238R') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.6078/D1941T'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.6078/D1941T') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.7272/Q6W37T8B'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.7272/Q6W37T8B') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.7280/D1P10V'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.7280/D1P10V') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.25338/B8CK5N'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.25338/B8CK5N') }),
        ],
      ],
      [
        [
          new URL('https://datadryad.org/dataset/doi:10.25349/D9VG9J'), // older DOI registrant
          new _.DryadDatasetId({ value: Doi.Doi('10.25349/D9VG9J') }),
        ],
      ],
    ],
  })('with a Dryad URL', ([url, id]) => {
    expect(_.fromUrl(url)).toStrictEqual(Option.some(id))
  })

  test.prop([fc.nonDatasetUrl()], {
    examples: [
      [new URL('https://foo.doi.org/10.5061/dryad.wstqjq2n3')], // unknown subdomain
      [new URL('https://doi.org/10.444444/555555')], // unknown prefix
      [new URL('https://doi.org/10.1101')], // missing suffix
      [new URL('https://doi.org/10.1101/')], // missing suffix
    ],
  })('with a non-dataset URL', url => {
    const actual = _.fromUrl(url)

    expect(actual).toStrictEqual(Option.none())
  })
})
