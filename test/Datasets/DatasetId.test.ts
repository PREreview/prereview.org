import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Option } from 'effect'
import * as _ from '../../src/Datasets/DatasetId.js'
import * as Datasets from '../../src/Datasets/index.js'
import { Doi } from '../../src/types/index.js'
import * as fc from '../fc.js'

describe('fromUrl', () => {
  test.failing.prop([fc.datasetId().map(id => [Doi.toUrl(id.value), id] as const)], {
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

  test.failing.prop([fc.dryadDatasetUrl()], {
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
