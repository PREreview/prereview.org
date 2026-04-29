import { describe, expect, it } from '@effect/vitest'
import { Option, Tuple } from 'effect'
import * as _ from '../../src/Datasets/DatasetId.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { Doi } from '../../src/types/index.ts'
import * as fc from '../fc.ts'

describe('isDatasetDoi', () => {
  it.prop('with a dataset DOI', [fc.datasetDoi()], ([doi]) => {
    const actual = _.isDatasetDoi(doi)

    expect(actual).toBeTruthy()
  })

  it.prop(
    'with a non-dataset DOI',
    [fc.oneof(fc.doi(fc.constantFrom('0001', '1', '123', '1000')), fc.nonDatasetDoi())],
    ([doi]) => {
      const actual = _.isDatasetDoi(doi)

      expect(actual).toBeFalsy()
    },
  )
})

describe('parseDatasetDoi', () => {
  it.prop('with a dataset DOI', [fc.datasetId().map(id => Tuple.make(id.value, id))], ([[doi, expected]]) => {
    const actual = _.parseDatasetDoi(doi)

    expect(actual).toStrictEqual(Option.some(expected))
  })

  it.prop(
    'with a non-dataset DOI',
    [fc.oneof(fc.doi(fc.constantFrom('0001', '1', '123', '1000')), fc.nonDatasetDoi())],
    ([doi]) => {
      const actual = _.parseDatasetDoi(doi)

      expect(actual).toStrictEqual(Option.none())
    },
  )
})

describe('fromUrl', () => {
  it.prop(
    'with a doi.org URL',
    [fc.datasetId().map(id => [Doi.toUrl(id.value), id] as const)],
    ([[url, expected]]) => {
      const actual = _.fromUrl(url)

      expect(actual).toStrictEqual(Option.some(expected))
    },
    {
      fastCheck: {
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
      },
    },
  )

  it.prop(
    'with a Dryad URL',
    [fc.dryadDatasetUrl()],
    ([[url, id]]) => {
      expect(_.fromUrl(url)).toStrictEqual(Option.some(id))
    },
    {
      fastCheck: {
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
              new URL('https://datadryad.org/dataset/doi:10.5068/D1339F'), // older DOI registrant
              new _.DryadDatasetId({ value: Doi.Doi('10.5068/D1339F') }),
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
              new URL('https://datadryad.org/dataset/doi:10.6086/D11974'), // older DOI registrant
              new _.DryadDatasetId({ value: Doi.Doi('10.6086/D11974') }),
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
              new URL('https://datadryad.org/dataset/doi:10.7291/D1S38T'), // older DOI registrant
              new _.DryadDatasetId({ value: Doi.Doi('10.7291/D1S38T') }),
            ],
          ],
          [
            [
              new URL('https://datadryad.org/dataset/doi:10.15146/zf0j-5m50'), // older DOI registrant
              new _.DryadDatasetId({ value: Doi.Doi('10.15146/zf0j-5m50') }),
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
      },
    },
  )

  it.prop(
    'with a SciELO URL',
    [fc.scieloDatasetUrl()],
    ([[url, id]]) => {
      expect(_.fromUrl(url)).toStrictEqual(Option.some(id))
    },
    {
      fastCheck: {
        examples: [
          [
            [
              new URL('https://data.scielo.org/dataset.xhtml?persistentId=doi:10.48331/SCIELODATA.QHC4EB'),
              new _.ScieloDatasetId({ value: Doi.Doi('10.48331/SCIELODATA.QHC4EB') }),
            ],
          ],
          [
            [
              new URL('http://data.scielo.org/dataset.xhtml?persistentId=doi:10.48331/SCIELODATA.QHC4EB'), // http
              new _.ScieloDatasetId({ value: Doi.Doi('10.48331/SCIELODATA.QHC4EB') }),
            ],
          ],
          [
            [
              new URL('https://data.scielo.org/dataset.xhtml?persistentId=doi:10.48331/SCIELODATA.QHC4EB&version=1.0'), // version
              new _.ScieloDatasetId({ value: Doi.Doi('10.48331/SCIELODATA.QHC4EB') }),
            ],
          ],
          [
            [
              new URL('https://data.scielo.org/citation?persistentId=doi:10.48331/SCIELODATA.QHC4EB'), // citation
              new _.ScieloDatasetId({ value: Doi.Doi('10.48331/SCIELODATA.QHC4EB') }),
            ],
          ],
        ],
      },
    },
  )

  it.prop(
    'with a non-dataset URL',
    [fc.nonDatasetUrl()],
    ([url]) => {
      const actual = _.fromUrl(url)

      expect(actual).toStrictEqual(Option.none())
    },
    {
      fastCheck: {
        examples: [
          [new URL('https://foo.doi.org/10.5061/dryad.wstqjq2n3')], // unknown subdomain
          [new URL('https://doi.org/10.444444/555555')], // unknown prefix
          [new URL('https://doi.org/10.1101')], // missing suffix
          [new URL('https://doi.org/10.1101/')], // missing suffix
        ],
      },
    },
  )
})
