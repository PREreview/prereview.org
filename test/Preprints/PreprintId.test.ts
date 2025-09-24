import { test } from '@fast-check/jest'
import { describe, expect } from '@jest/globals'
import { Doi, toUrl } from 'doi-ts'
import * as _ from '../../src/Preprints/PreprintId.ts'
import * as fc from '../fc.ts'

describe('PreprintIdEquivalence', () => {
  test.prop([fc.indeterminatePreprintId().map(id => [id, id] as const)], {
    examples: [
      [
        [
          new _.BiorxivPreprintId({ value: Doi('10.1101/abc123') }),
          new _.BiorxivPreprintId({ value: Doi('10.1101/abc123') }),
        ],
      ],
      [[new _.PhilsciPreprintId({ value: 1 }), new _.PhilsciPreprintId({ value: 1 })]],
      [
        [
          new _.BiorxivPreprintId({ value: Doi('10.1101/abc123') }),
          new _.BiorxivPreprintId({ value: Doi('10.1101/Abc123') }),
        ],
      ],
    ],
  })('with the same preprint ID', ([id1, id2]) => {
    expect(_.PreprintIdEquivalence(id1, id2)).toBe(true)
  })

  test.prop(
    [
      fc
        .tuple(fc.indeterminatePreprintId(), fc.indeterminatePreprintId())
        .filter(([id1, id2]) => id1._tag !== id2._tag),
    ],
    {
      examples: [
        [
          [
            new _.BiorxivPreprintId({ value: Doi('10.1101/abc123') }),
            new _.BiorxivPreprintId({ value: Doi('10.1101/abc124') }),
          ],
        ],
        [[new _.PhilsciPreprintId({ value: 1 }), new _.PhilsciPreprintId({ value: 2 })]],
        [
          [
            new _.BiorxivPreprintId({ value: Doi('10.1101/abc123') }),
            new _.BiorxivOrMedrxivPreprintId({ value: Doi('10.1101/abc123') }),
          ],
        ],
      ],
    },
  )('with different preprint IDs', ([id1, id2]) => {
    expect(_.PreprintIdEquivalence(id1, id2)).toBe(false)
  })
})

describe('isPreprintDoi', () => {
  test.prop([fc.preprintDoi()])('with a preprint DOI', doi => {
    expect(_.isPreprintDoi(doi)).toBe(true)
  })

  test.prop([fc.doi(fc.constantFrom('0001', '1', '123', '1000'))])('with a non-preprint DOI', doi => {
    expect(_.isPreprintDoi(doi)).toBe(false)
  })
})

describe('fromUrl', () => {
  test.prop([fc.preprintDoi().map(doi => [toUrl(doi), doi] as const)], {
    examples: [
      [[new URL('http://doi.org/10.1101/2021.06.18.21258689'), Doi('10.1101/2021.06.18.21258689')]],
      [[new URL('https://dx.doi.org/10.1101/2021.06.18.21258689'), Doi('10.1101/2021.06.18.21258689')]],
      [[new URL('http://dx.doi.org/10.1101/2021.06.18.21258689'), Doi('10.1101/2021.06.18.21258689')]],
    ],
  })('with a doi.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(_.fromPreprintDoi(doi)))
  })

  test.prop([fc.africarxivPreprintUrl().map(([url, id]) => [url, Array.of(id)] as const)], {
    examples: [
      // figshare
      [
        [
          new URL(
            'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801',
          ),
          [new _.AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') })],
        ],
      ],
      [
        [
          new URL(
            'https://www.africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801',
          ),
          [new _.AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') })],
        ],
      ], // www.
      [
        [
          new URL(
            'http://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801',
          ),
          [new _.AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') })],
        ],
      ], // http
      [
        [
          new URL(
            'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801/',
          ),
          [new _.AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') })],
        ],
      ], // trailing slash

      [
        [
          new URL(
            'https://africarxiv.figshare.com/articles/preprint/Revisiting_drug_resistance_mechanisms_of_a_notorious_nosocomial_pathogen_Acinetobacter_baumannii/19064801/1/files/33888380.pdf',
          ),
          [new _.AfricarxivFigsharePreprintId({ value: Doi('10.6084/m9.figshare.19064801.v1') })],
        ],
      ], // pdf
      // ofs
      [
        [
          new URL('https://www.osf.io/preprints/africarxiv/grxt6'),
          [new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') })],
        ],
      ], // www.
      [
        [
          new URL('http://osf.io/preprints/africarxiv/grxt6'),
          [new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') })],
        ],
      ], // http
      [
        [
          new URL('https://osf.io/preprints/africarxiv/grxt6/'),
          [new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') })],
        ],
      ], // trailing slash
      [
        [
          new URL('https://osf.io/preprints/africarxiv/grxt6'),
          [new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') })],
        ],
      ], // with preprints
      [
        [
          new URL('https://osf.io/preprints/africarxiv/grxt6/download'),
          [new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') })],
        ],
      ], // download
      [
        [
          new URL('https://osf.io/preprints/africarxiv/grxt6_v1'),
          [
            new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6_v1') }),
            new _.AfricarxivOsfPreprintId({ value: Doi('10.31730/osf.io/grxt6') }),
          ],
        ],
      ], // with version
    ],
  })('with an AfricArXiv URL', ([url, ids]) => {
    expect(_.fromUrl(url)).toStrictEqual(ids)
  })

  test.prop([fc.arxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('http://arxiv.org/abs/1501.00001'), Doi('10.48550/arXiv.1501.00001')]], // http
      [[new URL('https://www.arxiv.org/abs/1501.00001'), Doi('10.48550/arXiv.1501.00001')]], // www.
      [[new URL('https://arxiv.org/abs/1501.00001v1'), Doi('10.48550/arXiv.1501.00001')]], // with version
      [[new URL('https://arxiv.org/abs/hep-th/9901001'), Doi('10.48550/arXiv.hep-th/9901001')]], // old ID
      [[new URL('https://arxiv.org/abs/hep-th/9901001v3'), Doi('10.48550/arXiv.hep-th/9901001')]], // old ID with version
      [[new URL('https://arxiv.org/abs/0706.0001'), Doi('10.48550/arXiv.0706.0001')]], // shorter ID
      [[new URL('https://arxiv.org/abs/0706.0001v2'), Doi('10.48550/arXiv.0706.0001')]], // shorter ID with version
      [[new URL('https://arxiv.org/abs/1501.00001?context=math.IT'), Doi('10.48550/arXiv.1501.00001')]], // with context
      [[new URL('https://arxiv.org/abs/1501.00001?fmt=txt'), Doi('10.48550/arXiv.1501.00001')]], // in format
      [[new URL('https://arxiv.org/format/1501.00001'), Doi('10.48550/arXiv.1501.00001')]], // formats
      [[new URL('https://arxiv.org/pdf/1501.00001'), Doi('10.48550/arXiv.1501.00001')]], // pdf
      [[new URL('https://arxiv.org/pdf/1501.00001.pdf'), Doi('10.48550/arXiv.1501.00001')]], // pdf with extension
    ],
  })('with an arxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.ArxivPreprintId({ value: doi })))
  })

  test.prop([fc.authoreaPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('https://www.authorea.com/doi/full/10.22541/au.151130001.16288476'),
          Doi('10.22541/au.151130001.16288476'),
        ],
      ],
      [
        [
          new URL('http://www.authorea.com/doi/full/10.22541/au.151130001.16288476'), // http
          Doi('10.22541/au.151130001.16288476'),
        ],
      ],
      [
        [
          new URL('https://authorea.com/doi/full/10.22541/au.151130001.16288476'), // no www.
          Doi('10.22541/au.151130001.16288476'),
        ],
      ],
      [
        [
          new URL('https://www.authorea.com/doi/full/10.22541/au.169193526.65755206/v1'), // with version
          Doi('10.22541/au.169193526.65755206/v1'),
        ],
      ],
      [
        [
          new URL(
            'https://www.authorea.com/doi/full/10.22541/au.151130001.16288476?commit=4a4c4a232ca939a62df5cf78fafdb35642322241',
          ), // with a commit
          Doi('10.22541/au.151130001.16288476'),
        ],
      ],
    ],
  })('with an authorea.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.AuthoreaPreprintId({ value: doi })))
  })

  test.prop([fc.biorxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('http://www.biorxiv.org/content/10.1101/2023.02.13.528276'), // http
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2'), // with version
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.article-info'), // with section
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.full.pdf'), // pdf
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('https://www.biorxiv.org/content/10.1101/2023.02.13.528276v2.full.pdf+html'), // pdf
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('https://www.biorxiv.org/content/biorxiv/early/2023/02/17/2023.02.13.528276.full.pdf'), // pdf
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
      [
        [
          new URL('http://biorxiv.org/lookup/doi/10.1101/2023.02.13.528276'), // DOI resolution
          Doi('10.1101/2023.02.13.528276'),
        ],
      ],
    ],
  })('with a biorxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.BiorxivPreprintId({ value: doi })))
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
    expect(_.fromUrl(url)).toHaveLength(0)
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
    expect(_.fromUrl(url)).toHaveLength(0)
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
    expect(_.fromUrl(url)).toHaveLength(0)
  })

  test.prop([fc.edarxivPreprintUrl().map(([url, id]) => [url, Array.of(id.value)] as const)], {
    examples: [
      [[new URL('https://www.edarxiv.org/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // www.
      [[new URL('http://edarxiv.org/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // http
      [[new URL('https://edarxiv.org/wc6r7/'), [Doi('10.35542/osf.io/wc6r7')]]], // trailing slash
      [[new URL('https://edarxiv.org/preprints/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // with preprints
      [[new URL('https://edarxiv.org/wc6r7/download'), [Doi('10.35542/osf.io/wc6r7')]]], // download
      [[new URL('https://edarxiv.org/preprints/wc6r7/download'), [Doi('10.35542/osf.io/wc6r7')]]], // download
      [[new URL('https://edarxiv.org/wc6r7/download?format=pdf'), [Doi('10.35542/osf.io/wc6r7')]]], // download pdf
      [[new URL('https://www.osf.io/preprints/edarxiv/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // www.
      [[new URL('http://osf.io/preprints/edarxiv/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // http
      [[new URL('https://osf.io/preprints/edarxiv/wc6r7/'), [Doi('10.35542/osf.io/wc6r7')]]], // trailing slash
      [[new URL('https://osf.io/preprints/edarxiv/wc6r7'), [Doi('10.35542/osf.io/wc6r7')]]], // with preprints
      [[new URL('https://osf.io/preprints/edarxiv/wc6r7/download'), [Doi('10.35542/osf.io/wc6r7')]]], // download
      [
        [
          new URL('https://osf.io/preprints/edarxiv/wc6r7_v1'), // with version
          [Doi('10.35542/osf.io/wc6r7_v1'), Doi('10.35542/osf.io/wc6r7')],
        ],
      ],
    ],
  })('with an edarxiv.org URL', ([url, dois]) => {
    expect(_.fromUrl(url)).toStrictEqual(dois.map(doi => new _.EdarxivPreprintId({ value: doi })))
  })

  test.prop([fc.engrxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://www.engrxiv.org/preprint/view/2172'), Doi('10.31224/2172')]], // www.
      [[new URL('http://engrxiv.org/preprint/view/2172'), Doi('10.31224/2172')]], // http
      [[new URL('https://engrxiv.org/preprint/view/2172/'), Doi('10.31224/2172')]], // trailing slash
      [[new URL('https://engrxiv.org/preprint/view/2172/version/3242'), Doi('10.31224/2172')]], //version
      [[new URL('https://engrxiv.org/preprint/view/2172/4288'), Doi('10.31224/2172')]], // html view of pdf
      [[new URL('https://engrxiv.org/preprint/download/2172/4288'), Doi('10.31224/2172')]], // download
      [[new URL('https://engrxiv.org/preprint/download/2172/4288/3228'), Doi('10.31224/2172')]], // download
    ],
  })('with an engrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.EngrxivPreprintId({ value: doi })))
  })

  test.prop([fc.jxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('https://jxiv.jst.go.jp/index.php/jxiv/preprint/view/1041/version/1215'), // version
          Doi('10.51094/jxiv.1041'),
        ],
      ],
      [
        [
          new URL('https://jxiv.jst.go.jp/index.php/jxiv/preprint/view/1041/2898'), // html view of pdf
          Doi('10.51094/jxiv.1041'),
        ],
      ],
      [
        [
          new URL('https://jxiv.jst.go.jp/index.php/jxiv/preprint/download/1041/2898'), // pdf
          Doi('10.51094/jxiv.1041'),
        ],
      ],
    ],
  })('with a Jxiv URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.JxivPreprintId({ value: doi })))
  })

  test.prop([fc.lifecycleJournalPreprintUrl()], {
    examples: [
      [
        [
          new URL('https://www.osf.io/ngpkr'), // www.
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
      [
        [
          new URL('http://osf.io/ngpkr'), // http
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/ngpkr/'), // trailing slash
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/ngpkr/files'), // files
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/ngpkr/files/osfstorage/67f92093ee1abafa7ffe2baa'), // file
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/ngpkr?revisionId=67f92088449eb891c08a2bec'), // revisionId
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ngpkr') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ngpkr') }),
          ],
        ],
      ],
    ],
  })('with an Lifecycle Journal URL', ([url, ids]) => {
    expect(_.fromUrl(url)).toStrictEqual(ids)
  })

  test.prop([fc.medrxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('http://www.medrxiv.org/content/10.1101/2020.04.08.20058073'), // http
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3'), // with version
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.article-info'), // with section
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [[new URL('http://medrxiv.org/cgi/content/short/2020.04.08.20058073'), Doi('10.1101/2020.04.08.20058073')]],
      [
        [
          new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.full.pdf'), // pdf
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.full.pdf+html'), // pdf
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/medrxiv/early/2020/09/10/2020.04.08.20058073.full.pdf'), // pdf
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/10.1101/2020.04.08.20058073v3.ppt'), // ppt
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('http://medrxiv.org/lookup/doi/10.1101/2020.04.08.20058073'), // DOI resolution
          Doi('10.1101/2020.04.08.20058073'),
        ],
      ],
      [
        [
          new URL('https://www.medrxiv.org/content/medrxiv/early/2023/02/17/2023.01.17.23284673/embed/graphic-3.gif'), // article thumbnail
          Doi('10.1101/2023.01.17.23284673'),
        ],
      ],
    ],
  })('with a medrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.MedrxivPreprintId({ value: doi })))
  })

  test.prop([fc.metaarxivPreprintUrl().map(([url, id]) => [url, Array.of(id.value)] as const)], {
    examples: [
      [[new URL('https://www.osf.io/preprints/metaarxiv/9a3rw'), [Doi('10.31222/osf.io/9a3rw')]]], // www.
      [[new URL('http://osf.io/preprints/metaarxiv/9a3rw'), [Doi('10.31222/osf.io/9a3rw')]]], // http
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw/'), [Doi('10.31222/osf.io/9a3rw')]]], // trailing slash
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw'), [Doi('10.31222/osf.io/9a3rw')]]], // with preprints
      [[new URL('https://osf.io/preprints/metaarxiv/9a3rw/download'), [Doi('10.31222/osf.io/9a3rw')]]], // download
      [
        [
          new URL('https://osf.io/preprints/metaarxiv/9a3rw_v1'), // with version
          [Doi('10.31222/osf.io/9a3rw_v1'), Doi('10.31222/osf.io/9a3rw')],
        ],
      ],
    ],
  })('with a MetaArXiv URL', ([url, dois]) => {
    expect(_.fromUrl(url)).toStrictEqual(dois.map(doi => new _.MetaarxivPreprintId({ value: doi })))
  })

  test.prop([fc.neurolibrePreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://www.neurolibre.org/papers/10.55458/neurolibre.00031'), Doi('10.55458/neurolibre.00031')]], // www.
      [[new URL('http://neurolibre.org/papers/10.55458/neurolibre.00031'), Doi('10.55458/neurolibre.00031')]], // www.
      [[new URL('http://neurolibre.org/papers/10.55458/neurolibre.00031/'), Doi('10.55458/neurolibre.00031')]], // trailing slash
      [[new URL('http://neurolibre.org/papers/10.55458/neurolibre.00031/'), Doi('10.55458/neurolibre.00031')]], // trailing slash
      [[new URL('https://preprint.neurolibre.org/10.55458/neurolibre.00031/'), Doi('10.55458/neurolibre.00031')]], // living preprint
      [
        [
          new URL('https://preprint.neurolibre.org/10.55458/neurolibre.00031/figure-1'), // figure
          Doi('10.55458/neurolibre.00031'),
        ],
      ],
      [[new URL('https://preprint.neurolibre.org/10.55458/neurolibre.00031.pdf'), Doi('10.55458/neurolibre.00031')]], // pdf
      [
        [
          new URL(
            'https://preprint.neurolibre.org/10.55458/neurolibre.00031/build/figure_1-6a6420a891b472b9c278b2d7c3d9f6f5.ipynb',
          ), // download notebook
          Doi('10.55458/neurolibre.00031'),
        ],
      ],
    ],
  })('with an neurolibre.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.NeurolibrePreprintId({ value: doi })))
  })

  test.prop([fc.osfPreprintUrl()], {
    examples: [
      [
        [
          new URL('https://www.osf.io/eq8bk'), // www.
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
          ],
        ],
      ],
      [
        [
          new URL('http://osf.io/eq8bk'), // http
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/eq8bk/'), // trailing slash
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/eq8bk/files'), // download
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/eq8bk/files/osfstorage/65011184767f4a2606de90c6'), // file
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/eq8bk') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/eq8bk') }),
          ],
        ],
      ],
    ],
  })('with an OSF URL', ([url, ids]) => {
    expect(_.fromUrl(url)).toStrictEqual(ids)
  })

  test.prop([fc.osfPreprintsPreprintUrl()], {
    examples: [
      [
        [
          new URL('https://www.osf.io/ewdn8'), // www.
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ewdn8') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') }),
          ],
        ],
      ],
      [
        [
          new URL('http://osf.io/ewdn8'), // http
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ewdn8') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/ewdn8/'), // trailing slash
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ewdn8') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/preprints/ewdn8'), // with preprints
          [new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') })],
        ],
      ],
      [
        [
          new URL('https://osf.io/ewdn8/download'), // download
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ewdn8') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') }),
          ],
        ],
      ],
      [
        [
          new URL('https://osf.io/preprints/ewdn8/download'), // download
          [new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') })],
        ],
      ],
      [
        [
          new URL('https://osf.io/ewdn8/download?format=pdf'), // download pdf
          [
            new _.OsfOrLifecycleJournalPreprintId({ value: Doi('10.17605/osf.io/ewdn8') }),
            new _.OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/ewdn8') }),
          ],
        ],
      ],
    ],
  })('with an OSF Preprints URL', ([url, ids]) => {
    expect(_.fromUrl(url)).toStrictEqual(ids)
  })

  test.prop([fc.philsciPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://philsci-archive.pitt.edu/21986/'), 21986]],
      [[new URL('https://www.philsci-archive.pitt.edu/21986/'), 21986]], // www.
      [[new URL('http://philsci-archive.pitt.edu/21986/'), 21986]], // http
      [[new URL('https://philsci-archive.pitt.edu/21986'), 21986]], // no trailing slash
      [[new URL('http://philsci-archive.pitt.edu/id/eprint/21986'), 21986]], // ID
      [[new URL('https://philsci-archive.pitt.edu/21986/1/preprint_OS_2023.pdf'), 21986]], // download
      [[new URL('https://philsci-archive.pitt.edu/21986/1.haslightboxThumbnailVersion/preprint_OS_2023.pdf'), 21986]], // preview
      [[new URL('http://philsci-archive.pitt.edu/cgi/export/21986/HTML/philsci-archive-21986.html'), 21986]], // HTML citation
      [[new URL('https://philsci-archive.pitt.edu/cgi/export/21986/Text_Chicago/philsci-archive-21986.txt'), 21986]], // text citation
    ],
  })('with a philsci-archive.pitt.edu URL', ([url, id]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.PhilsciPreprintId({ value: id })))
  })

  test.prop([fc.preprintsorgPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://www.preprints.org/manuscript/202303.0344/v1'), Doi('10.20944/preprints202303.0344.v1')]],
      [
        [
          new URL('https://preprints.org/manuscript/202303.0344/v1'), // no www.
          Doi('10.20944/preprints202303.0344.v1'),
        ],
      ],
      [
        [
          new URL('http://www.preprints.org/manuscript/202303.0344/v1'), // http
          Doi('10.20944/preprints202303.0344.v1'),
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/'), // trailing slash
          Doi('10.20944/preprints202303.0344.v1'),
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/download'), // download
          Doi('10.20944/preprints202303.0344.v1'),
        ],
      ],
      [
        [
          new URL('https://www.preprints.org/manuscript/202303.0344/v1/download/supplementary'), // download supplementary
          Doi('10.20944/preprints202303.0344.v1'),
        ],
      ],
    ],
  })('with an preprints.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.PreprintsorgPreprintId({ value: doi })))
  })

  test.prop([fc.psyarxivPreprintUrl().map(([url, id]) => [url, Array.of(id.value)] as const)], {
    examples: [
      [[new URL('https://www.psyarxiv.com/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // www.
      [[new URL('http://psyarxiv.com/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // http
      [[new URL('https://psyarxiv.com/k9mn3/'), [Doi('10.31234/osf.io/k9mn3')]]], // trailing slash
      [[new URL('https://psyarxiv.com/preprints/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // with preprints
      [[new URL('https://psyarxiv.com/k9mn3/download'), [Doi('10.31234/osf.io/k9mn3')]]], // download
      [[new URL('https://psyarxiv.com/preprints/k9mn3/download'), [Doi('10.31234/osf.io/k9mn3')]]], // download
      [[new URL('https://psyarxiv.com/k9mn3/download?format=pdf'), [Doi('10.31234/osf.io/k9mn3')]]], // download pdf
      [[new URL('https://www.osf.io/preprints/psyarxiv/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // www.
      [[new URL('http://osf.io/preprints/psyarxiv/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // http
      [[new URL('https://osf.io/preprints/psyarxiv/k9mn3/'), [Doi('10.31234/osf.io/k9mn3')]]], // trailing slash
      [[new URL('https://osf.io/preprints/psyarxiv/k9mn3'), [Doi('10.31234/osf.io/k9mn3')]]], // with preprints
      [[new URL('https://osf.io/preprints/psyarxiv/k9mn3/download'), [Doi('10.31234/osf.io/k9mn3')]]], // download
      [
        [
          new URL('https://osf.io/preprints/psyarxiv/3ekr8_v2'), // with version
          [Doi('10.31234/osf.io/3ekr8_v2'), Doi('10.31234/osf.io/3ekr8')],
        ],
      ],
    ],
  })('with an psyarxiv.com URL', ([url, dois]) => {
    expect(_.fromUrl(url)).toStrictEqual(dois.map(doi => new _.PsyarxivPreprintId({ value: doi })))
  })

  test.prop([fc.researchSquarePreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://researchsquare.com/article/rs-2609755/v1'), Doi('10.21203/rs.3.rs-2609755/v1')]], // no www.
      [
        [
          new URL('http://www.researchsquare.com/article/rs-2609755/v1'), // http
          Doi('10.21203/rs.3.rs-2609755/v1'),
        ],
      ],
      [
        [
          new URL('https://www.researchsquare.com/article/rs-2609755/v1/'), // trailing slash
          Doi('10.21203/rs.3.rs-2609755/v1'),
        ],
      ],
      [
        [
          new URL('https://www.researchsquare.com/article/rs-2609755/v1.pdf'), // pdf
          Doi('10.21203/rs.3.rs-2609755/v1'),
        ],
      ],
      [
        [
          new URL('https://assets.researchsquare.com/files/rs-2609755/v1/fc7f953cb5cfb4b664a2d448.pdf'), // pdf
          Doi('10.21203/rs.3.rs-2609755/v1'),
        ],
      ],
    ],
  })('with a researchsquare.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.ResearchSquarePreprintId({ value: doi })))
  })

  test.prop([fc.scieloPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/5577/version/5899'), // version
          Doi('10.1590/SciELOPreprints.5577'),
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/5577/10753'), // html view of pdf
          Doi('10.1590/SciELOPreprints.5577'),
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/download/5577/10753'), // pdf
          Doi('10.1590/SciELOPreprints.5577'),
        ],
      ],
      [
        [
          new URL('https://preprints.scielo.org/index.php/scielo/preprint/download/5577/10753/11315'), // pdf
          Doi('10.1590/SciELOPreprints.5577'),
        ],
      ],
    ],
  })('with a SciELO URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.ScieloPreprintId({ value: doi })))
  })

  test.prop([fc.scienceOpenPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('http://www.scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'), // http
          Doi('10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'),
        ],
      ],
      [
        [
          new URL('https://scienceopen.com/hosted-document?doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'), // no www.
          Doi('10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'),
        ],
      ],
      [
        [
          new URL(
            'https://www.scienceopen.com/hosted-document?-1.ILinkListener-header-action~bar-download~dropdown-pdf~link-link&doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1',
          ), // pdf
          Doi('10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'),
        ],
      ],
      [
        [
          new URL(
            'https://www.scienceopen.com/hosted-document?-1.ILinkListener-header-action~bar-download~dropdown-xml~link-link&doi=10.14293/S2199-1006.1.SOR-.PPI1TYM.v1',
          ), // xml
          Doi('10.14293/S2199-1006.1.SOR-.PPI1TYM.v1'),
        ],
      ],
    ],
  })('with a scienceopen.com URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.ScienceOpenPreprintId({ value: doi })))
  })

  test.prop([fc.socarxivPreprintUrl().map(([url, id]) => [url, Array.of(id.value)] as const)], {
    examples: [
      [[new URL('https://www.osf.io/preprints/socarxiv/8374m'), [Doi('10.31235/osf.io/8374m')]]], // www.
      [[new URL('http://osf.io/preprints/socarxiv/8374m'), [Doi('10.31235/osf.io/8374m')]]], // http
      [[new URL('https://osf.io/preprints/socarxiv/8374m/'), [Doi('10.31235/osf.io/8374m')]]], // trailing slash
      [[new URL('https://osf.io/preprints/socarxiv/8374m'), [Doi('10.31235/osf.io/8374m')]]], // with preprints
      [[new URL('https://osf.io/preprints/socarxiv/8374m/download'), [Doi('10.31235/osf.io/8374m')]]], // download
      [
        [
          new URL('https://osf.io/preprints/socarxiv/8374m_v1'), // with version
          [Doi('10.31235/osf.io/8374m_v1'), Doi('10.31235/osf.io/8374m')],
        ],
      ],
    ],
  })('with an SocArXiv URL', ([url, dois]) => {
    expect(_.fromUrl(url)).toStrictEqual(dois.map(doi => new _.SocarxivPreprintId({ value: doi })))
  })

  test.prop([fc.ssrnPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://ssrn.com/abstract=5018989'), Doi('10.2139/ssrn.5018989')]], // advertised
      [[new URL('https://www.ssrn.com/abstract=5018989'), Doi('10.2139/ssrn.5018989')]], // www.
      [[new URL('http://ssrn.com/abstract=5018989'), Doi('10.2139/ssrn.5018989')]], //  // http
      [[new URL('https://ssrn.com/abstract=5018989/'), Doi('10.2139/ssrn.5018989')]], // trailing slash
      [[new URL('https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5018989'), Doi('10.2139/ssrn.5018989')]], // view
      [[new URL('https://papers.ssrn.com/sol3/Delivery.cfm?abstractid=5018989'), Doi('10.2139/ssrn.5018989')]], // download
      [
        [
          new URL(
            'https://papers.ssrn.com/sol3/Delivery.cfm/20bf8675-a4d6-47aa-ad95-489d45e106a1-MECA.pdf?abstractid=5018989&mirid=1',
          ), // download
          Doi('10.2139/ssrn.5018989'),
        ],
      ],
      [
        [
          new URL(
            'https://download.ssrn.com/nsc/20bf8675-a4d6-47aa-ad95-489d45e106a1-meca.pdf?response-content-disposition=inline&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20250401T095732Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&abstractId=5018989',
          ), // open in browser
          Doi('10.2139/ssrn.5018989'),
        ],
      ],
    ],
  })('with a SSRN URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.SsrnPreprintId({ value: doi })))
  })

  test.prop([fc.techrxivPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [
        [
          new URL('https://www.techrxiv.org/doi/full/10.36227/techrxiv.170794036.66542348'),
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
      [
        [
          new URL('http://www.techrxiv.org/doi/full/10.36227/techrxiv.170794036.66542348'), // http
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
      [
        [
          new URL('https://techrxiv.org/doi/full/10.36227/techrxiv.170794036.66542348'), // no www.
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
      [
        [
          new URL('https://www.techrxiv.org/doi/full/10.36227/techrxiv.170794036.66542348/v1'), // with version
          Doi('10.36227/techrxiv.170794036.66542348/v1'),
        ],
      ],
      [
        [
          new URL(
            'https://www.techrxiv.org/doi/full/10.36227/techrxiv.170794036.66542348?commit=5545b39f226ecbb6a796058e63464f5b4772a78d',
          ), // with a commit
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
      [
        [
          new URL('https://www.techrxiv.org/doi/pdf/10.36227/techrxiv.170794036.66542348'), // pdf
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
      [
        [
          new URL('https://www.techrxiv.org/doi/xml/10.36227/techrxiv.170794036.66542348'), // xml
          Doi('10.36227/techrxiv.170794036.66542348'),
        ],
      ],
    ],
  })('with an techrxiv.org URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.TechrxivPreprintId({ value: doi })))
  })

  test.prop([fc.zenodoPreprintUrl().map(([url, id]) => [url, id.value] as const)], {
    examples: [
      [[new URL('https://zenodo.org/record/4290795'), Doi('10.5281/zenodo.4290795')]],
      [[new URL('https://www.zenodo.org/record/4290795'), Doi('10.5281/zenodo.4290795')]], // www.
      [[new URL('http://zenodo.org/record/4290795'), Doi('10.5281/zenodo.4290795')]], // http
      [
        [
          new URL('https://zenodo.org/record/4290795/files/f1000research-revised.pdf'), // file
          Doi('10.5281/zenodo.4290795'),
        ],
      ],
      [
        [
          new URL('https://zenodo.org/record/4290795/preview/f1000research-revised.pdf'), // file preview
          Doi('10.5281/zenodo.4290795'),
        ],
      ],
      [[new URL('https://zenodo.org/record/4290795/export/json'), Doi('10.5281/zenodo.4290795')]], // export
    ],
  })('with a Zenodo URL', ([url, doi]) => {
    expect(_.fromUrl(url)).toStrictEqual(Array.of(new _.ZenodoOrAfricarxivPreprintId({ value: doi })))
  })

  test.prop([fc.url()], {
    examples: [
      [new URL('https://foo.doi.org/10.1101/2021.06.18.21258689')], // unknown subdomain
      [new URL('https://doi.org/10.444444/555555')], // unknown prefix
      [new URL('https://doi.org/10.1101')], // missing suffix
      [new URL('https://doi.org/10.1101/')], // missing suffix
    ],
  })('with a non-preprint URL', url => {
    expect(_.fromUrl(url)).toHaveLength(0)
  })
})
