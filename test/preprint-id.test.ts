import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi, isDoi, toUrl } from 'doi-ts'
import * as O from 'fp-ts/Option'
import * as _ from '../src/preprint-id'
import * as fc from './fc'

describe('isPreprintDoi', () => {
  test.prop([fc.preprintDoi()])('with a preprint DOI', doi => {
    expect(_.isPreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.doi()])('with a non-preprint DOI', doi => {
    expect(_.isPreprintDoi(doi)).toBe(false)
  })
})

describe('fromUrl', () => {
  test.prop([fc.preprintDoi().map(doi => [toUrl(doi), doi] as const)], {
    examples: [
      [[new URL('http://doi.org/10.1101/2021.06.18.21258689'), '10.1101/2021.06.18.21258689' as Doi<'1101'>]],
      [[new URL('https://dx.doi.org/10.1101/2021.06.18.21258689'), '10.1101/2021.06.18.21258689' as Doi<'1101'>]],
      [[new URL('http://dx.doi.org/10.1101/2021.06.18.21258689'), '10.1101/2021.06.18.21258689' as Doi<'1101'>]],
    ],
  })('with a doi.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop(
    [
      fc
        .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
        .filter(suffix => isDoi(`10.1101/${suffix}`))
        .map(
          suffix =>
            [new URL(`https://www.biorxiv.org/content/10.1101/${suffix}`), `10.1101/${suffix}` as Doi<'1101'>] as const,
        ),
    ],
    {
      examples: [
        [
          [
            new URL('http://www.biorxiv.org/content/10.1101/2023.02.13.528276'), // http
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2'), // with version
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.article-info'), // with section
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.full.pdf'), // pdf
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.full.pdf+html'), // pdf
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.biorxiv.org/content/biorxiv/early/2023/02/17/2023.02.13.528276.full.pdf'), // pdf
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('http://biorxiv.org/lookup/doi/10.1101/2023.02.13.528276'), // DOI resolution
            '10.1101/2023.02.13.528276' as Doi<'1101'>,
          ],
        ],
      ],
    },
  )('with a biorxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.url()], {
    examples: [
      [new URL('https://foo.doi.org/10.1101/2021.06.18.21258689')], // unknown subdomain
      [new URL('https://doi.org/10.444444/555555')], // unknown prefix
      [new URL('https://doi.org/10.1101')], // missing suffix
      [new URL('https://doi.org/10.1101/')], // missing suffix
    ],
  })('with a non-preprint URL', url => {
    expect(_.fromUrl(url)).toStrictEqual(O.none)
  })
})
