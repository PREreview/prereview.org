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
        .filter(suffix => isDoi(`10.48550/${suffix}`))
        .map(
          suffix => [new URL(`https://arxiv.org/abs/${suffix}`), `10.48550/arXiv.${suffix}` as Doi<'48550'>] as const,
        ),
    ],
    {
      examples: [
        [[new URL('http://arxiv.org/abs/1501.00001'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // http
        [[new URL('https://www.arxiv.org/abs/1501.00001'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // www.
        [[new URL('https://arxiv.org/abs/1501.00001v1'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // with version
        [[new URL('https://arxiv.org/abs/hep-th/9901001'), '10.48550/arXiv.hep-th/9901001' as Doi<'48550'>]], // old ID
        [[new URL('https://arxiv.org/abs/hep-th/9901001v3'), '10.48550/arXiv.hep-th/9901001' as Doi<'48550'>]], // old ID with version
        [[new URL('https://arxiv.org/abs/0706.0001'), '10.48550/arXiv.0706.0001' as Doi<'48550'>]], // shorter ID
        [[new URL('https://arxiv.org/abs/0706.0001v2'), '10.48550/arXiv.0706.0001' as Doi<'48550'>]], // shorter ID with version
        [[new URL('https://arxiv.org/abs/1501.00001?context=math.IT'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // with context
        [[new URL('https://arxiv.org/abs/1501.00001?fmt=txt'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // in format
        [[new URL('https://arxiv.org/format/1501.00001'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // formats
        [[new URL('https://arxiv.org/pdf/1501.00001'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // pdf
        [[new URL('https://arxiv.org/pdf/1501.00001.pdf'), '10.48550/arXiv.1501.00001' as Doi<'48550'>]], // pdf with extension
      ],
    },
  )('with an arxiv.org URL', ([url, doi]) => {
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

  test.prop(
    [
      fc
        .stringOf(fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'), { minLength: 1 })
        .filter(suffix => isDoi(`10.1101/${suffix}`))
        .map(
          suffix =>
            [new URL(`https://www.medrxiv.org/content/10.1101/${suffix}`), `10.1101/${suffix}` as Doi<'1101'>] as const,
        ),
    ],
    {
      examples: [
        [
          [
            new URL('http://www.medrxiv.org/content/10.1101/2020.04.08.20058073'), // http
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3'), // with version
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.article-info'), // with section
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('http://medrxiv.org/cgi/content/short/2020.04.08.20058073'),
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.full.pdf'), // pdf
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.full.pdf+html'), // pdf
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/medrxiv/early/2020/09/10/2020.04.08.20058073.full.pdf'), // pdf
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.ppt'), // ppt
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('http://medrxiv.org/lookup/doi/10.1101/2020.04.08.20058073'), // DOI resolution
            '10.1101/2020.04.08.20058073' as Doi<'1101'>,
          ],
        ],
        [
          [
            new URL('https://www.medrxiv.org/content/medrxiv/early/2023/02/17/2023.01.17.23284673/embed/graphic-3.gif'), // article thumbnail
            '10.1101/2023.01.17.23284673' as Doi<'1101'>,
          ],
        ],
      ],
    },
  )('with a medrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([
    fc
      .integer()
      .map(
        id =>
          [
            new URL(`https://preprints.scielo.org/index.php/scielo/preprint/view/${id}`),
            `10.1590/SciELOPreprints.${id}` as Doi<'1590'>,
          ] as const,
      ),
  ])('with a SciELO URL', ([url, doi]) => {
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
