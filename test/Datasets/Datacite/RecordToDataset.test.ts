import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Effect, pipe, Schema } from 'effect'
import { URL } from 'url'
import * as _ from '../../../src/Datasets/Datacite/RecordToDataset.ts'
import * as Datasets from '../../../src/Datasets/index.ts'
import { Datacite } from '../../../src/ExternalApis/index.ts'
import { rawHtml } from '../../../src/html.ts'
import { Doi, OrcidId } from '../../../src/types/index.ts'
import * as EffectTest from '../../EffectTest.ts'

test.each([
  {
    response: 'dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The submitted dataset contains the metadata collected from 500 articles in\n the field of ecology and evolution. This includes articles from the\n following journals: Ecology and Evolution, PLoS One, Proceedings of the\n Royal Society B, Ecology and the preprint server bioRxiv. Direct\n identifiers have been removed from the dataset. These included the first\n and last names of authors. No more than three indirect identifiers have\n been provided. Information found herein includes article titles, number of\n authors and ECR status, among others. A README file has been attached to\n provide greater details about the dataset.</p>',
        ),
      },
      authors: [
        { name: 'Jesse Wolf' },
        { name: 'Layla MacKay' },
        { name: 'Sarah Haworth' },
        { name: 'Morgan Dedato' },
        { name: 'Kiana Young' },
        { name: 'Marie-Laurence Cossette' },
        { name: 'Colin Elliott' },
        { name: 'Rebekah Oomen' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
      posted: Temporal.PlainDate.from({ year: 2022, month: 9, day: 2 }),
      title: {
        text: rawHtml('Metadata collected from 500 articles in the field of ecology and evolution'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
    }),
  },
  {
    response: 'dryad-html',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Many eye colour mutants have been identified in Drosophila melanogaster.\n Mutations in the sepia gene result in brown eyes due to a lack of PDA\n synthase, which is essential for production of the red drosopterin eye\n pigment. We previously used CRISPR/Cas9 to target the PDA synthase gene to\n establish sepia mutant strains for Drosophila suzukii (Matsumura)\n (Diptera: Drosophilidae), an invasive global pest of soft skinned fruits.\n The fecundity and fertility of some of the sepia mutant strains were\n similar to wild‐type. The goal of this study was to determine if the sepia\n gene could be used as a marker to identify transgenic D. suzukii. By using\n the sepia gene as a marker, we successfully developed lines expressing\n Streptomyces phage phiC31 integrase in the germline. For most of these\n lines, hemizygotes exhibited complete rescue of the sepia eye colour and\n relatively high levels of phiC31 RNA in ovaries. In contrast, lines with\n partial rescue showed low levels of sepia RNA in heads and phiC31 RNA in\n ovaries. These findings suggest that the sepia gene is an effective marker\n for D. suzukii transgenesis, and its relatively small size (1.8 kb) makes\n it advantageous when assembling large gene constructs. The phiC31\n integrase lines established in this study should serve as a valuable\n resource for future genetic research in D. suzukii, including the further\n development of strains for genetic biocontrol.</p>',
        ),
      },
      authors: [
        { name: 'Kalindu Ramyasoma Hewawasam', orcid: OrcidId.OrcidId('0000-0002-9796-2294') },
        { name: 'Akihiko Yamamoto' },
        { name: 'Maxwell Scott', orcid: OrcidId.OrcidId('0000-0001-6536-4735') },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.b2rbnzst9') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 9, day: 2 }),
      title: {
        text: rawHtml(
          'Data from: Establishment of transgenic <i>Drosophila suzukii</i> lines that express <i>phiC31</i> integrase and carry the <i>sepia</i> gene as a marker for transformation',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.b2rbnzst9'),
    }),
  },
  {
    response: 'dryad-cdl',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Cancer-associated fibroblasts (CAFs) are a prominent stromal cell type in\n solid tumors and molecules secreted by CAFs play an important role in\n tumor progression and metastasis. CAFs coexist as heterogeneous\n populations with potentially different biological functions. Although CAFs\n are a major component of the breast cancer stroma, molecular and\n phenotypic heterogeneity of CAFs in breast cancer is poorly understood. In\n this study, we investigated CAF heterogeneity in triple-negative breast\n cancer (TNBC) using a syngeneic mouse model, BALB/c-derived 4T1 mammary\n tumors. Using single-cell RNA sequencing (scRNA-seq), we identified six\n CAF subpopulations in 4T1 tumors including: 1) myofibroblastic CAFs,\n enriched for α-smooth muscle actin and several other contractile proteins;\n 2) ‘inflammatory’ CAFs with elevated expression of inflammatory cytokines;\n and 3) a CAF subpopulation expressing major histocompatibility complex\n (MHC) class II proteins that are generally expressed in antigen-presenting\n cells. Comparison of 4T1-derived CAFs to CAFs from pancreatic cancer\n revealed that these three CAF subpopulations exist in both tumor types.\n Interestingly, cells with inflammatory and MHC class II-expressing CAF\n profiles were also detected in normal breast/pancreas tissue, suggesting\n that these phenotypes are not tumor microenvironment-induced. This work\n enhances our understanding of CAF heterogeneity, and specifically\n targeting these CAF subpopulations could be an effective therapeutic\n approach for treating highly aggressive TNBCs.</p>',
        ),
      },
      authors: [
        { name: 'Nicholas Hum', orcid: OrcidId.OrcidId('0000-0003-1605-3193') },
        { name: 'Aimy Sebastian', orcid: OrcidId.OrcidId('0000-0002-7822-7040') },
        { name: 'Kelly Martin' },
        { name: 'Sean Gilmore' },
        { name: 'Stephen Byers' },
        { name: 'Elizabeth Wheeler' },
        { name: 'Matthew Coleman' },
        { name: 'Gabriela Loots' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.6071/m3238r') }),
      posted: Temporal.PlainDate.from({ year: 2020, month: 5, day: 22 }),
      title: {
        text: rawHtml(
          'Data from: Single-cell transcriptomic analysis of tumor-derived fibroblasts and normal tissue-resident fibroblasts reveals fibroblast heterogeneity in breast cancer',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.6071/M3238R'),
    }),
  },
])('can parse a record ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(_.RecordToDataset),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each([
  'arxiv',
  'lifecycle-journal-article',
  'lifecycle-journal-registration',
  'osf-file',
  'osf-project',
  'osf-registration',
  'zenodo-africarxiv',
  'zenodo-empty-resource-type',
  'zenodo-journal-article',
  'zenodo-no-abstract',
  'zenodo-trailing-space',
  'zenodo',
])('returns a specific error for non-dataset record (%s)', response =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(_.RecordToDataset),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('RecordIsNotSupported')
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
