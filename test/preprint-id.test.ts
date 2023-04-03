import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi, toUrl } from 'doi-ts'
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

  test.prop([fc.africarxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.osf.io/preprints/africarxiv/grxt6'), '10.31730/osf.io/grxt6' as Doi<'31730'>]], // www.
      [[new URL('http://osf.io/preprints/africarxiv/grxt6'), '10.31730/osf.io/grxt6' as Doi<'31730'>]], // http
      [[new URL('https://osf.io/preprints/africarxiv/grxt6/'), '10.31730/osf.io/grxt6' as Doi<'31730'>]], // trailing slash
      [[new URL('https://osf.io/preprints/africarxiv/grxt6'), '10.31730/osf.io/grxt6' as Doi<'31730'>]], // with preprints
      [[new URL('https://osf.io/preprints/africarxiv/grxt6/download'), '10.31730/osf.io/grxt6' as Doi<'31730'>]], // download
    ],
  })('with an AfricArXiv URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.arxivPreprintUrl()], {
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
  })('with an arxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.biorxivPreprintUrl()], {
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
  })('with a biorxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.chemrxivPreprintUrl()], {
    examples: [
      [new URL('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')],
      [new URL('https://www.chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')], // www.
      [new URL('http://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5')], // http
      [new URL('https://chemrxiv.org/engage/chemrxiv/article-details/6424647b91074bccd07d1aa5/')], // trailing slash
      [new URL('https://eartharxiv.org/repository/object/5218/download/10284/')], // download
      [
        new URL(
          'https://chemrxiv.org/engage/api-gateway/chemrxiv/assets/orp/resource/item/6424647b91074bccd07d1aa5/original/prediction-of-toluene-water-partition-coefficient-in-the-sampl9-blind-challenge-assessment-of-machine-learning-and-ief-pcm-mst-continuum-solvation-models.pdf',
        ),
      ], // pdf
      [
        new URL(
          'https://chemrxiv.org/engage/api-gateway/chemrxiv/assets/orp/resource/item/6424647b91074bccd07d1aa5/largeThumb/prediction-of-toluene-water-partition-coefficient-in-the-sampl9-blind-challenge-assessment-of-machine-learning-and-ief-pcm-mst-continuum-solvation-models.jpg',
        ),
      ], //image
    ],
  })('with an chemrxiv.org URL', url => {
    expect(_.fromUrl(url)).toStrictEqual(O.none)
  })

  test.prop([fc.eartharxivPreprintUrl()], {
    examples: [
      [new URL('https://eartharxiv.org/repository/view/5218/')],
      [new URL('https://www.eartharxiv.org/repository/view/5218/')], // www.
      [new URL('http://eartharxiv.org/repository/view/5218/')], // http
      [new URL('https://eartharxiv.org/repository/view/5218')], // no trailing slash
      [new URL('https://eartharxiv.org/repository/object/5218/download/10284/')], // download
      [new URL('https://eartharxiv.org/repository/view/5218/pdf/?file=/repository/object/5218/download/10284/')], // pdf
    ],
  })('with an eartharxiv.org URL', url => {
    expect(_.fromUrl(url)).toStrictEqual(O.none)
  })

  test.prop([fc.ecoevorxivPreprintUrl()], {
    examples: [
      [new URL('https://ecoevorxiv.org/repository/view/5216/')],
      [new URL('https://www.ecoevorxiv.org/repository/view/5216/')], // www.
      [new URL('http://ecoevorxiv.org/repository/view/5216/')], // http
      [new URL('https://ecoevorxiv.org/repository/view/5216')], // no trailing slash
      [new URL('https://ecoevorxiv.org/repository/object/5216/download/10289/')], // download
      [new URL('https://ecoevorxiv.org/repository/view/5216/pdf/?file=/repository/object/5216/download/10289/')], // pdf
    ],
  })('with an ecoevorxiv.org URL', url => {
    expect(_.fromUrl(url)).toStrictEqual(O.none)
  })

  test.prop([fc.edarxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.edarxiv.org/wc6r7'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // www.
      [[new URL('http://edarxiv.org/wc6r7'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // http
      [[new URL('https://edarxiv.org/wc6r7/'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // trailing slash
      [[new URL('https://edarxiv.org/preprints/wc6r7'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // with preprints
      [[new URL('https://edarxiv.org/wc6r7/download'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // download
      [[new URL('https://edarxiv.org/preprints/wc6r7/download'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // download
      [[new URL('https://edarxiv.org/wc6r7/download?format=pdf'), '10.35542/osf.io/wc6r7' as Doi<'35542'>]], // download pdf
    ],
  })('with an edarxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.engrxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.engrxiv.org/preprint/view/2172'), '10.31224/2172' as Doi<'31224'>]], // www.
      [[new URL('http://engrxiv.org/preprint/view/2172'), '10.31224/2172' as Doi<'31224'>]], // http
      [[new URL('https://engrxiv.org/preprint/view/2172/'), '10.31224/2172' as Doi<'31224'>]], // trailing slash
      [[new URL('https://engrxiv.org/preprint/view/2172/version/3242'), '10.31224/2172' as Doi<'31224'>]], //version
      [[new URL('https://engrxiv.org/preprint/view/2172/4288'), '10.31224/2172' as Doi<'31224'>]], // html view of pdf
      [[new URL('https://engrxiv.org/preprint/download/2172/4288'), '10.31224/2172' as Doi<'31224'>]], // download
      [[new URL('https://engrxiv.org/preprint/download/2172/4288/3228'), '10.31224/2172' as Doi<'31224'>]], // download
    ],
  })('with an engrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.medrxivPreprintUrl()], {
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
  })('with a medrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.metaarxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.osf.io/preprints/metaarxiv/9a3rw'), '10.31222/osf.io/9a3rw' as Doi<'31222'>]], // www.
      [[new URL('http://osf.io/preprints/metaarxiv/9a3rw'), '10.31222/osf.io/9a3rw' as Doi<'31222'>]], // http
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw/'), '10.31222/osf.io/9a3rw' as Doi<'31222'>]], // trailing slash
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw'), '10.31222/osf.io/9a3rw' as Doi<'31222'>]], // with preprints
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw/download'), '10.31222/osf.io/9a3rw' as Doi<'31222'>]], // download
    ],
  })('with a MetaArXiv URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.osfPreprintUrl()], {
    examples: [
      [[new URL('https://www.osf.io/ewdn8'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // www.
      [[new URL('http://osf.io/ewdn8'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // http
      [[new URL('https://osf.io/ewdn8/'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // trailing slash
      [[new URL('https://osf.io/preprints/ewdn8'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // with preprints
      [[new URL('https://osf.io/ewdn8/download'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // download
      [[new URL('https://osf.io/preprints/ewdn8/download'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // download
      [[new URL('https://osf.io/ewdn8/download?format=pdf'), '10.31219/osf.io/ewdn8' as Doi<'31219'>]], // download pdf
    ],
  })('with an OSF URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.preprintsorgPreprintUrl()], {
    examples: [
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1'),
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
      [
        [
          new URL('https://preprints.org/manuscript/202303.0344/v1'), // no www.
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
      [
        [
          new URL('http://www.preprints.org/manuscript/202303.0344/v1'), // http
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/'), // trailing slash
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/download'), // download
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/download/supplementary'), // download supplementary
          '10.20944/preprints202303.0344.v1' as Doi<'20944'>,
        ],
      ],
    ],
  })('with an preprints.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.psyarxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.psyarxiv.com/k9mn3'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // www.
      [[new URL('http://psyarxiv.com/k9mn3'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // http
      [[new URL('https://psyarxiv.com/k9mn3/'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // trailing slash
      [[new URL('https://psyarxiv.com/preprints/k9mn3'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // with preprints
      [[new URL('https://psyarxiv.com/k9mn3/download'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // download
      [[new URL('https://psyarxiv.com/preprints/k9mn3/download'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // download
      [[new URL('https://psyarxiv.com/k9mn3/download?format=pdf'), '10.31234/osf.io/k9mn3' as Doi<'31234'>]], // download pdf
    ],
  })('with an psyarxiv.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.researchSquarePreprintUrl()], {
    examples: [
      [[new URL('https://researchsquare.com/article/rs-2609755/v1'), '10.21203/rs.3.rs-2609755/v1' as Doi<'21203'>]], // no www.
      [
        [
          new URL('http://www.researchsquare.com/article/rs-2609755/v1'), // http
          '10.21203/rs.3.rs-2609755/v1' as Doi<'21203'>,
        ],
      ],
      [
        [
          new URL('https://www.researchsquare.com/article/rs-2609755/v1/'), // trailing slash
          '10.21203/rs.3.rs-2609755/v1' as Doi<'21203'>,
        ],
      ],
      [
        [
          new URL('https://www.researchsquare.com/article/rs-2609755/v1.pdf'), // pdf
          '10.21203/rs.3.rs-2609755/v1' as Doi<'21203'>,
        ],
      ],
      [
        [
          new URL('https://assets.researchsquare.com/files/rs-2609755/v1/fc7f953cb5cfb4b664a2d448.pdf'), // pdf
          '10.21203/rs.3.rs-2609755/v1' as Doi<'21203'>,
        ],
      ],
    ],
  })('with a researchsquare.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.scieloPreprintUrl()], {
    examples: [
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/5577/version/5899'), // version
          '10.1590/SciELOPreprints.5577' as Doi<'1590'>,
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/5577/10753'), // html view of pdf
          '10.1590/SciELOPreprints.5577' as Doi<'1590'>,
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/download/5577/10753'), // pdf
          '10.1590/SciELOPreprints.5577' as Doi<'1590'>,
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/download/5577/10753/11315'), // pdf
          '10.1590/SciELOPreprints.5577' as Doi<'1590'>,
        ],
      ],
    ],
  })('with a SciELO URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.scienceOpenPreprintUrl()], {
    examples: [
      [
        [
          new URL('http://www.scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'), // http
          '10.14293/S2199-1006.1.SOR-.PPI1TYM.v1' as Doi<'14293'>,
        ],
      ],
      [
        [
          new URL('https://scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'), // no www.
          '10.14293/S2199-1006.1.SOR-.PPI1TYM.v1' as Doi<'14293'>,
        ],
      ],
      [
        [
          new URL(
            'https://www.scienceopen.com/hosted-document?-1.ILinkListener-header-action~bar-download~dropdown-pdf~link-link&doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1',
          ), // pdf
          '10.14293/S2199-1006.1.SOR-.PPI1TYM.v1' as Doi<'14293'>,
        ],
      ],
      [
        [
          new URL(
            'https://www.scienceopen.com/hosted-document?-1.ILinkListener-header-action~bar-download~dropdown-xml~link-link&doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1',
          ), // xml
          '10.14293/S2199-1006.1.SOR-.PPI1TYM.v1' as Doi<'14293'>,
        ],
      ],
    ],
  })('with a scienceopen.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(O.some(doi))
  })

  test.prop([fc.socarxivPreprintUrl()], {
    examples: [
      [[new URL('https://www.osf.io/preprints/socarxiv/8374m'), '10.31235/osf.io/8374m' as Doi<'31235'>]], // www.
      [[new URL('http://osf.io/preprints/socarxiv/8374m'), '10.31235/osf.io/8374m' as Doi<'31235'>]], // http
      [[new URL('https://osf.io/preprints/socarxiv/8374m/'), '10.31235/osf.io/8374m' as Doi<'31235'>]], // trailing slash
      [[new URL('https://osf.io/preprints/socarxiv/8374m'), '10.31235/osf.io/8374m' as Doi<'31235'>]], // with preprints
      [[new URL('https://osf.io/preprints/socarxiv/8374m/download'), '10.31235/osf.io/8374m' as Doi<'31235'>]], // download
    ],
  })('with an SocArXiv URL', ([url, doi]) => {
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
