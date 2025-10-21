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
    response: 'cdl-ucm-dryad',
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
  {
    response: 'cdl-ucsf-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Isolated Lacrimal gland for Single Cell RNA sequence data from E16 and P4\n mice. These are the raw read count matrices along side the barcode for the\n cells and genes that span the sparse matrix. These results are published\n in Development: Defining epithelial cell dynamics and lineage\n relationships in the developing lacrimal gland.Abstract:The tear producing\n lacrimal gland is a tubular organ that protects and lubricates the ocular\n surface. While the lacrimal gland possesses many features that make it an\n excellent model to understand tubulogenesis, the cell types and lineage\n relationships that drive lacrimal gland formation are unclear. Using\n single cell sequencing and other molecular tools, we reveal novel cell\n identities and epithelial lineage dynamics that underlie lacrimal gland\n development. We show that the lacrimal gland from its earliest\n developmental stages is composed of multiple subpopulations of immune,\n epithelial, and mesenchymal cell lineages. The epithelial lineage exhibits\n the most substantiative cellular changes, transitioning through a series\n of unique transcriptional states to become terminally differentiated\n acinar, ductal and myoepithelial cells. Furthermore, lineage tracing in\n postnatal and adult glands provides the first direct evidence of unipotent\n KRT5+ epithelial cells in the lacrimal gland. Finally, we show\n conservation of developmental markers between the developing mouse and\n human lacrimal gland, supporting the use of mice to understand human\n development. Together, our data reveal critical features of lacrimal gland\n development that have broad implications for understanding epithelial\n organogenesis.</p>',
        ),
      },
      authors: [{ name: 'Shengyang Yu' }, { name: 'Aaron Tward' }, { name: 'Sarah Knox' }],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.7272/q6w37t8b') }),
      posted: Temporal.PlainDate.from({ year: 2017, month: 6, day: 13 }),
      title: {
        text: rawHtml('10x Lacrimal Gland scRNA seq data matrix'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.7272/Q6W37T8B'),
    }),
  },
  {
    response: 'cdl-ucd-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>All experiments were conducted during the Fire Influence on Regional to\n Global Environments Experiment (FIREX) lab study, which took place at the\n Missoula Fire Sciences Lab in Missoula, MT, USA during November,\n 2016. Experiments focused on refining our understanding of\n emissions and short timescale processing. The focus was on measuring fuels\n or combustion conditions that are characteristic of the western U.S. that\n may be under-sampled by the fire research community. Numerous\n types of biomass were combusted in a large chamber (12 x 12 x 19 m) and\n the smoke sampled to provide information on the physical, chemical, and\n optical properties of the resulting smoke (i.e., particulate and gas\n emissions). The general fuels types combusted included (exclusively or in\n combination): duff, dung, excelsior, straw, litter, untreated lumber,\n rotten debris, woody debris, shrub, herbaceous, and canopy biomass. Smoke\n from these burns was sampled into a small photochemical reaction chamber\n (the "mini Chamber"). The smoke from the mini Chamber was\n characterized using a variety of instrumentation: an Aerodyne high\n resolution aerosol mass spectrometer (HR-AMS) for non-refractory submicron\n particulate matter (NR-PM); an Aerodyne soot photometer aerosol\n mass spectrometer (SP-AMS) in "laser-only" mode, for refractory\n black carbon and NR-PM components mixed with BC; a DMT single\n particle soot photometer (SP2) for refractory black carbon;\n a Brechtel scanning electrical mobility sizer (SEMS), for\n particle size distributions; the UC Davis cavity\n ringdown/photoacoustic spectrometer (CRD-PAS), for particle absorption and\n extinction at 405 nm and 532 nm; a DMT PASS-3, for absorption and\n extinction at 781 nm; a thermodenuder, for heating particles to 300 degC\n for ~ 5 seconds; a proton transfer reaction mass spectrometer (PTRMS); and\n an iodide reagent ion chemical ionization mass spectrometer (I-CIMS). Not\n all measurements from all of these instruments are archived here; full\n data sets can be downloded from the National Oceanic and Atmospheric\n Administration\n at https://www.esrl.noaa.gov/csd/projects/firex/firelab/.  Measurements were made of both unprocessed (fresh) and photochemically aged particles and gases.</p>',
        ),
      },
      authors: [
        { name: 'Christopher Cappa', orcid: OrcidId.OrcidId('0000-0002-3528-3368') },
        { name: 'Christopher Lim' },
        { name: 'David Hagan' },
        { name: 'Jesse Kroll' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.25338/b8ck5n') }),
      posted: Temporal.PlainDate.from({ year: 2019, month: 8, day: 6 }),
      title: {
        text: rawHtml(
          'Measurements from the Fire Influence on Regional and Global Environments Experiment (FIREX) Fire Lab Mini Chamber Experiment',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.25338/B8CK5N'),
    }),
  },
  {
    response: 'cdl-ucb-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The snowpack of the Sierra Nevada Mountains is an indispensable freshwater\n resource for large portions of western North America. The Central Sierra\n Snow Laboratory (CSSL) has had an integral role in the measurement of\n snowfall and snowpack properties within the Sierra Nevada Mountains, and\n has worked to develop a physical understanding of the processes that\n govern snow since 1946. This dataset contains measurements of temperature,\n precipitation quantity, snowfall, and snowpack characteristics, including\n 24-hour snowfall, snowpack depth, and snow water equivalent for each water\n year (October 1 to September 30) from 1971 to 2025 at CSSL except for\n Water Year 2020. Measurements were made at the same location at CSSL for\n the entirety of the 53-year measurement period to ensure continuity of\n record with minimal effects from differences in measurement location.</p>',
        ),
      },
      authors: [
        { name: 'Andrew Schwartz', orcid: OrcidId.OrcidId('0000-0002-2623-5962') },
        { name: 'Randall Osterhuber' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.6078/d1941t') }),
      posted: Temporal.PlainDate.from({ year: 2021, month: 6, day: 22 }),
      title: {
        text: rawHtml(
          'Snowpack, precipitation, and temperature measurements at the Central Sierra Snow Laboratory for water years 1971 to 2025',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.6078/D1941T'),
    }),
  },
  {
    response: 'cdl-uci-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Ocean acidification and warming are expected to have negative impacts on\n marine organisms, and particularly on shell-building species.\n Acidification and warming may operate independently or interactively,\n amplifying or mitigating impacts on individuals. Previous results have\n primarily come from lab studies of single species, yet these climate\n stressors are occurring within naturally dynamic systems with high abiotic\n and biotic variability. As a result, the impacts of these stressors in\n situ remains poorly understood. We conducted a 6-month field manipulation\n to determine the effects of ocean acidification and warming on a\n habitat-forming shellfish, the Pacific blue mussel (Mytilus trossulus), in\n a dynamic coastal system. Twenty tide pools were factorially manipulated,\n including unmanipulated control, CO2 added, warmed, and combined CO2 added\n and warmed treatments. We measured mussel shell thickness, strength, and\n corrosion at 0, 3, and 6 months of exposure to treatment conditions. CO2\n addition led to a decrease in shell thickness and strength and an increase\n in shell corrosion. However, we also detected an increase in shell\n strength for mussels exposed to both CO2 addition and warming. These\n findings indicate that ocean acidification negatively impacted shellfish\n in situ and that these effects might be mitigated when exposed\n concurrently to moderate warming, leading to an interactive effect of\n acidification and warming on this critical habitat-forming shellfish.</p>',
        ),
      },
      authors: [
        { name: 'Racine Rangel', orcid: OrcidId.OrcidId('0000-0002-2833-0832') },
        { name: 'Matthew Bracken' },
        { name: 'Kristy Kroeker' },
        { name: 'Luke Miller' },
        { name: 'Cascade Sorte' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.7280/d1p10v') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 10, day: 3 }),
      title: {
        text: rawHtml(
          'Factorial field manipulation reveals multi-stressor effects on a critical habitat-forming shellfish',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.7280/D1P10V'),
    }),
  },
  {
    response: 'cdl-ucsb-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The Devereux Slough is a Temporary Open closed Estuary (TOCE). Nutrient\n concentrations were taken during storm events from 5 locations the are\n inlets to the Devereux Slough to estimate nutrient export to the ocean\n while the slough is open.</p>',
        ),
      },
      authors: [{ name: 'Alison Rickard', orcid: OrcidId.OrcidId('0000-0002-7939-8394') }],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.25349/d9vg9j') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 8, day: 4 }),
      title: {
        text: rawHtml('Nutrient concentrations of the Devereux Slough, 2018–2022 (nitrogen, phosphorus and ammonium)'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.25349/D9VG9J'),
    }),
  },
  {
    response: 'dryad-alt',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Grounding line, elevation changes, and melt rates maps of Denman Glacier,\n East Antarctica. Using satellite radar interferometry from the\n COSMO-SkyMed mission we map the grounding line of Denman Glacier, East\n Antarctica. We complement these data with some historical interferometric\n radar acquisition from the European satellite ERS-1/2. We present new maps\n of elevation changes on the grounded and floating portions of Denman\n Glacier obtained by temporally differencing TanDEM-X Digital Elevation\n Models.</p>',
        ),
      },
      authors: [
        { name: 'Virginia Brancato', orcid: OrcidId.OrcidId('0000-0001-6322-0439') },
        { name: 'Eric Rignot' },
        { name: 'Pietro Milillo' },
        { name: 'Mathieu Morlighem', orcid: OrcidId.OrcidId('0000-0001-5219-1310') },
        { name: 'Jeremie Mouginot' },
        { name: 'Lu An', orcid: OrcidId.OrcidId('0000-0003-3507-5953') },
        { name: 'Bernd Scheuchl' },
        { name: 'Seong Su Jeong', orcid: OrcidId.OrcidId('0000-0002-6844-5925') },
        { name: 'Paola Rizzoli' },
        { name: 'Jose Luiz Bueso Bello' },
        { name: 'Pau Prats-Iraola' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.15146/zf0j-5m50') }),
      posted: Temporal.PlainDate.from({ year: 2020, month: 2, day: 28 }),
      title: {
        text: rawHtml('Grounding line of Denman Glacier, East Antarctica from satellite radar interferometry'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.15146/zf0j-5m50'),
    }),
  },
  {
    response: 'cdl-ucla-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Although evolutionary biologists have long theorized that variation in DNA\n repair efficacy might explain some of the diversity of lifespan and cancer\n incidence across species, we have little data on the variability of normal\n germline mutagenesis outside of humans. Here, we shed light on the\n spectrum and etiology of mutagenesis across mammals by quantifying\n mutational sequence context biases using polymorphism data from thirteen\n species of mice, apes, bears, wolves, and cetaceans. After normalizing the\n mutation spectrum for reference genome accessibility and k-mer content, we\n use the Mantel test to deduce that mutation spectrum divergence is highly\n correlated with genetic divergence between species, whereas life history\n traits like reproductive age are weaker predictors of mutation spectrum\n divergence. Potential bioinformatic confounders are only weakly related to\n a small set of mutation spectrum features. We find that clocklike\n mutational signatures previously inferred from human cancers cannot\n explain the phylogenetic signal exhibited by the mammalian mutation\n spectrum, despite the ability of these clocklike signatures to fit each\n species’ 3-mer spectrum with high cosine similarity. In contrast, parental\n aging signatures inferred from human de novo mutation data appear to\n explain much of the mutation spectrum’s phylogenetic signal when fit to\n non-context-dependent mutation spectrum data in combination with a novel\n mutational signature. We posit that future models purporting to explain\n the etiology of mammalian mutagenesis need to capture the fact that more\n closely related species have more similar mutation spectra; a model that\n fits each marginal spectrum with high cosine similarity is not guaranteed\n to capture this hierarchy of mutation spectrum variation among species.</p>',
        ),
      },
      authors: [
        { name: 'Annabel Beichman', orcid: OrcidId.OrcidId('0000-0002-6991-587X') },
        { name: 'Jacqueline Robinson' },
        { name: 'Meixi Lin' },
        { name: 'Andrés Moreno-Estrada' },
        { name: 'Sergio Nigenda-Morales' },
        { name: 'Kelley Harris' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5068/d1339f') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 9, day: 11 }),
      title: {
        text: rawHtml('Data files associated with: Evolution of the mutation spectrum across a mammalian phylogeny'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.5068/D1339F'),
    }),
  },
  {
    response: 'cdl-ucsc-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Monitoring planktonic larvae is important for understanding changes in\n recruitment, range shifts, and reproductive behavior. Here, we used light\n traps to examine the abundance, community diversity, and ontogenetic\n structure of ichthyoplankton and octopus paralarvae at three sites around\n Santa Catalina Island, California, USA across two seasons between 2018 and\n 2019. We identified 15,919 fish larvae and 205 octopus paralarvae using\n morphology supplemented by DNA barcoding. We found no differences in\n larval fish diversity or abundance between years or seasons. All octopus\n paralarvae were captured in the summer and were identified as Octopus\n bimaculatus. Cryptic substrate-associated fishes dominated samples,\n especially those from suborder Blennioidei and family Gobiidae. We\n conclude that light traps can be a valuable tool and useful supplement to\n other zooplankton sampling methods, especially in providing a more\n complete assessment of nearshore plankton communities and taxa which have\n been poorly represented in traditional, offshore monitoring programs. They\n may be particularly useful for studying cryptic and substrate-associated\n species whose larvae are often poorly described in the existing\n identification literature.</p>',
        ),
      },
      authors: [
        { name: 'Katherine Dale', orcid: OrcidId.OrcidId('0000-0002-8544-1571') },
        { name: 'Elena Pilch' },
        { name: 'Mary Gomes' },
        { name: 'Nora Laszlo' },
        { name: 'Adam Mercer' },
        { name: 'Rita Mehta' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.7291/d1s38t') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 9, day: 9 }),
      title: {
        text: rawHtml(
          'Using light traps to assess larval fish and octopus paralarvae diversity and ontogenetic structure around Santa Catalina Island, CA',
        ),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.7291/D1S38T'),
    }),
  },
  {
    response: 'cdl-ucr-dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>This is a real-world dataset in a full-service supply chain company to\n evaluate the performance of our proposed battery electric truck\n dispatching strategy. We generated four instances ranging from 47 to 90\n customers based on the real-world dataset, the typical one-day historical\n movements of a heavy-duty diesel truck fleet that operated in the\n Riverside and San Bernardino County regions of California.</p>',
        ),
      },
      authors: [
        { name: 'Dongbo Peng', orcid: OrcidId.OrcidId('0000-0002-9857-3303') },
        { name: 'Guoyuan Wu' },
        { name: 'Kanok Boriboonsomsin' },
      ],
      id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.6086/d11974') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 7, day: 5 }),
      title: {
        text: rawHtml('Developing an efficient dispatching strategy to support commercial fleet electrification'),
        language: 'en',
      },
      url: new URL('https://datadryad.org/dataset/doi:10.6086/D11974'),
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

test.each(['dryad-collection'])('returns a specific error for a non-dataset record (%s)', response =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Datacite/RecordSamples/${response}.json`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Datacite.RecordResponseSchema))),
      Effect.andThen(_.RecordToDataset),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('NotADataset')
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each([
  'arxiv',
  'cdl-ucb',
  'cdl-ucd',
  'cdl-uci',
  'cdl-ucm',
  'cdl-ucr',
  'cdl-ucsc',
  'cdl-ucsf',
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
])('returns a specific error for non-supported record (%s)', response =>
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
