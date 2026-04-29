import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/vitest'
import { Temporal } from '@js-temporal/polyfill'
import { Effect, Layer, pipe, Schema } from 'effect'
import { URL } from 'url'
import { expect } from 'vitest'
import * as Datasets from '../../../../src/Datasets/index.ts'
import { Datacite } from '../../../../src/ExternalApis/index.ts'
import * as _ from '../../../../src/ExternalInteractions/DatasetData/Datacite/RecordToDataset.ts'
import { LanguageDetection } from '../../../../src/ExternalInteractions/index.ts'
import { rawHtml } from '../../../../src/html.ts'
import { Doi, OrcidId } from '../../../../src/types/index.ts'
import * as EffectTest from '../../../EffectTest.ts'

test.each([
  {
    response: 'dryad',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution. This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset. These included the first and last names of authors. No more than three indirect identifiers have been provided. Information found herein includes article titles, number of authors and ECR status, among others. A README file has been attached to provide greater details about the dataset.</p>',
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
          '<p>Many eye colour mutants have been identified in Drosophila melanogaster. Mutations in the sepia gene result in brown eyes due to a lack of PDA synthase, which is essential for production of the red drosopterin eye pigment. We previously used CRISPR/Cas9 to target the PDA synthase gene to establish sepia mutant strains for Drosophila suzukii (Matsumura) (Diptera: Drosophilidae), an invasive global pest of soft skinned fruits. The fecundity and fertility of some of the sepia mutant strains were similar to wild‐type. The goal of this study was to determine if the sepia gene could be used as a marker to identify transgenic D. suzukii. By using the sepia gene as a marker, we successfully developed lines expressing Streptomyces phage phiC31 integrase in the germline. For most of these lines, hemizygotes exhibited complete rescue of the sepia eye colour and relatively high levels of phiC31 RNA in ovaries. In contrast, lines with partial rescue showed low levels of sepia RNA in heads and phiC31 RNA in ovaries. These findings suggest that the sepia gene is an effective marker for D. suzukii transgenesis, and its relatively small size (1.8 kb) makes it advantageous when assembling large gene constructs. The phiC31 integrase lines established in this study should serve as a valuable resource for future genetic research in D. suzukii, including the further development of strains for genetic biocontrol.</p>',
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
          '<p>Cancer-associated fibroblasts (CAFs) are a prominent stromal cell type in solid tumors and molecules secreted by CAFs play an important role in tumor progression and metastasis. CAFs coexist as heterogeneous populations with potentially different biological functions. Although CAFs are a major component of the breast cancer stroma, molecular and phenotypic heterogeneity of CAFs in breast cancer is poorly understood. In this study, we investigated CAF heterogeneity in triple-negative breast cancer (TNBC) using a syngeneic mouse model, BALB/c-derived 4T1 mammary tumors. Using single-cell RNA sequencing (scRNA-seq), we identified six CAF subpopulations in 4T1 tumors including: 1) myofibroblastic CAFs, enriched for α-smooth muscle actin and several other contractile proteins; 2) ‘inflammatory’ CAFs with elevated expression of inflammatory cytokines; and 3) a CAF subpopulation expressing major histocompatibility complex (MHC) class II proteins that are generally expressed in antigen-presenting cells. Comparison of 4T1-derived CAFs to CAFs from pancreatic cancer revealed that these three CAF subpopulations exist in both tumor types. Interestingly, cells with inflammatory and MHC class II-expressing CAF profiles were also detected in normal breast/pancreas tissue, suggesting that these phenotypes are not tumor microenvironment-induced. This work enhances our understanding of CAF heterogeneity, and specifically targeting these CAF subpopulations could be an effective therapeutic approach for treating highly aggressive TNBCs.</p>',
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
          '<p>Isolated Lacrimal gland for Single Cell RNA sequence data from E16 and P4 mice. These are the raw read count matrices along side the barcode for the cells and genes that span the sparse matrix. These results are published in Development: Defining epithelial cell dynamics and lineage relationships in the developing lacrimal gland.Abstract:The tear producing lacrimal gland is a tubular organ that protects and lubricates the ocular surface. While the lacrimal gland possesses many features that make it an excellent model to understand tubulogenesis, the cell types and lineage relationships that drive lacrimal gland formation are unclear. Using single cell sequencing and other molecular tools, we reveal novel cell identities and epithelial lineage dynamics that underlie lacrimal gland development. We show that the lacrimal gland from its earliest developmental stages is composed of multiple subpopulations of immune, epithelial, and mesenchymal cell lineages. The epithelial lineage exhibits the most substantiative cellular changes, transitioning through a series of unique transcriptional states to become terminally differentiated acinar, ductal and myoepithelial cells. Furthermore, lineage tracing in postnatal and adult glands provides the first direct evidence of unipotent KRT5+ epithelial cells in the lacrimal gland. Finally, we show conservation of developmental markers between the developing mouse and human lacrimal gland, supporting the use of mice to understand human development. Together, our data reveal critical features of lacrimal gland development that have broad implications for understanding epithelial organogenesis.</p>',
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
          '<p>All experiments were conducted during the Fire Influence on Regional to Global Environments Experiment (FIREX) lab study, which took place at the Missoula Fire Sciences Lab in Missoula, MT, USA during November, 2016. Experiments focused on refining our understanding of emissions and short timescale processing. The focus was on measuring fuels or combustion conditions that are characteristic of the western U.S. that may be under-sampled by the fire research community. Numerous types of biomass were combusted in a large chamber (12 x 12 x 19 m) and the smoke sampled to provide information on the physical, chemical, and optical properties of the resulting smoke (i.e., particulate and gas emissions). The general fuels types combusted included (exclusively or in combination): duff, dung, excelsior, straw, litter, untreated lumber, rotten debris, woody debris, shrub, herbaceous, and canopy biomass. Smoke from these burns was sampled into a small photochemical reaction chamber (the "mini Chamber"). The smoke from the mini Chamber was characterized using a variety of instrumentation: an Aerodyne high resolution aerosol mass spectrometer (HR-AMS) for non-refractory submicron particulate matter (NR-PM); an Aerodyne soot photometer aerosol mass spectrometer (SP-AMS) in "laser-only" mode, for refractory black carbon and NR-PM components mixed with BC; a DMT single particle soot photometer (SP2) for refractory black carbon; a Brechtel scanning electrical mobility sizer (SEMS), for particle size distributions; the UC Davis cavity ringdown/photoacoustic spectrometer (CRD-PAS), for particle absorption and extinction at 405 nm and 532 nm; a DMT PASS-3, for absorption and extinction at 781 nm; a thermodenuder, for heating particles to 300 degC for ~ 5 seconds; a proton transfer reaction mass spectrometer (PTRMS); and an iodide reagent ion chemical ionization mass spectrometer (I-CIMS). Not all measurements from all of these instruments are archived here; full data sets can be downloded from the National Oceanic and Atmospheric Administration at https://www.esrl.noaa.gov/csd/projects/firex/firelab/. Measurements were made of both unprocessed (fresh) and photochemically aged particles and gases.</p>',
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
          '<p>The snowpack of the Sierra Nevada Mountains is an indispensable freshwater resource for large portions of western North America. The Central Sierra Snow Laboratory (CSSL) has had an integral role in the measurement of snowfall and snowpack properties within the Sierra Nevada Mountains, and has worked to develop a physical understanding of the processes that govern snow since 1946. This dataset contains measurements of temperature, precipitation quantity, snowfall, and snowpack characteristics, including 24-hour snowfall, snowpack depth, and snow water equivalent for each water year (October 1 to September 30) from 1971 to 2025 at CSSL except for Water Year 2020. Measurements were made at the same location at CSSL for the entirety of the 53-year measurement period to ensure continuity of record with minimal effects from differences in measurement location.</p>',
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
          '<p>Ocean acidification and warming are expected to have negative impacts on marine organisms, and particularly on shell-building species. Acidification and warming may operate independently or interactively, amplifying or mitigating impacts on individuals. Previous results have primarily come from lab studies of single species, yet these climate stressors are occurring within naturally dynamic systems with high abiotic and biotic variability. As a result, the impacts of these stressors in situ remains poorly understood. We conducted a 6-month field manipulation to determine the effects of ocean acidification and warming on a habitat-forming shellfish, the Pacific blue mussel (Mytilus trossulus), in a dynamic coastal system. Twenty tide pools were factorially manipulated, including unmanipulated control, CO2 added, warmed, and combined CO2 added and warmed treatments. We measured mussel shell thickness, strength, and corrosion at 0, 3, and 6 months of exposure to treatment conditions. CO2 addition led to a decrease in shell thickness and strength and an increase in shell corrosion. However, we also detected an increase in shell strength for mussels exposed to both CO2 addition and warming. These findings indicate that ocean acidification negatively impacted shellfish in situ and that these effects might be mitigated when exposed concurrently to moderate warming, leading to an interactive effect of acidification and warming on this critical habitat-forming shellfish.</p>',
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
          '<p>The Devereux Slough is a Temporary Open closed Estuary (TOCE). Nutrient concentrations were taken during storm events from 5 locations the are inlets to the Devereux Slough to estimate nutrient export to the ocean while the slough is open.</p>',
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
          '<p>Grounding line, elevation changes, and melt rates maps of Denman Glacier, East Antarctica. Using satellite radar interferometry from the COSMO-SkyMed mission we map the grounding line of Denman Glacier, East Antarctica. We complement these data with some historical interferometric radar acquisition from the European satellite ERS-1/2. We present new maps of elevation changes on the grounded and floating portions of Denman Glacier obtained by temporally differencing TanDEM-X Digital Elevation Models.</p>',
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
          '<p>Although evolutionary biologists have long theorized that variation in DNA repair efficacy might explain some of the diversity of lifespan and cancer incidence across species, we have little data on the variability of normal germline mutagenesis outside of humans. Here, we shed light on the spectrum and etiology of mutagenesis across mammals by quantifying mutational sequence context biases using polymorphism data from thirteen species of mice, apes, bears, wolves, and cetaceans. After normalizing the mutation spectrum for reference genome accessibility and k-mer content, we use the Mantel test to deduce that mutation spectrum divergence is highly correlated with genetic divergence between species, whereas life history traits like reproductive age are weaker predictors of mutation spectrum divergence. Potential bioinformatic confounders are only weakly related to a small set of mutation spectrum features. We find that clocklike mutational signatures previously inferred from human cancers cannot explain the phylogenetic signal exhibited by the mammalian mutation spectrum, despite the ability of these clocklike signatures to fit each species’ 3-mer spectrum with high cosine similarity. In contrast, parental aging signatures inferred from human de novo mutation data appear to explain much of the mutation spectrum’s phylogenetic signal when fit to non-context-dependent mutation spectrum data in combination with a novel mutational signature. We posit that future models purporting to explain the etiology of mammalian mutagenesis need to capture the fact that more closely related species have more similar mutation spectra; a model that fits each marginal spectrum with high cosine similarity is not guaranteed to capture this hierarchy of mutation spectrum variation among species.</p>',
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
          '<p>Monitoring planktonic larvae is important for understanding changes in recruitment, range shifts, and reproductive behavior. Here, we used light traps to examine the abundance, community diversity, and ontogenetic structure of ichthyoplankton and octopus paralarvae at three sites around Santa Catalina Island, California, USA across two seasons between 2018 and 2019. We identified 15,919 fish larvae and 205 octopus paralarvae using morphology supplemented by DNA barcoding. We found no differences in larval fish diversity or abundance between years or seasons. All octopus paralarvae were captured in the summer and were identified as Octopus bimaculatus. Cryptic substrate-associated fishes dominated samples, especially those from suborder Blennioidei and family Gobiidae. We conclude that light traps can be a valuable tool and useful supplement to other zooplankton sampling methods, especially in providing a more complete assessment of nearshore plankton communities and taxa which have been poorly represented in traditional, offshore monitoring programs. They may be particularly useful for studying cryptic and substrate-associated species whose larvae are often poorly described in the existing identification literature.</p>',
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
          '<p>This is a real-world dataset in a full-service supply chain company to evaluate the performance of our proposed battery electric truck dispatching strategy. We generated four instances ranging from 47 to 90 customers based on the real-world dataset, the typical one-day historical movements of a heavy-duty diesel truck fleet that operated in the Riverside and San Bernardino County regions of California.</p>',
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
  {
    response: 'scielo-data-english',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>This dataset includes the raw data and the script used for the stastical analysis of the paper "Predation effect by cats and rodents on the reproductive success of seabirds: a systematic review and meta-analysis". It includes a README file and the following four files: "list_of_articles_for_review_cynthia_campolina" List of articles available in the literature used in the systematic review about the predation effect by cats and rodents on the reproducitve success of seabirds. Format: .txt "data_for_meta-analysis_cynthia_campolina" List of papers, among the reviewd articles, used for the meta-analysis and their respective data. Format: .txt "CM20023-EST03-1BD03-E" Original excel file that was used for the meta-analysis in the R program. We chose to keep the original name of the file once it is the one in the script (see "R_script_for_meta-analysis_cynthia_campolina" file). This excel file and the "data_for_meta-analysis_cynthia_campolina" file have the same data, but in different formats. Format: .xlsx "R_script_for_meta-analysis_cynthia_campolina" R script with the commands used to run the meta-analysis on the predation effect by cats and rodents on the reproducitve success of seabirds, using the data available on the "CM20023-EST03-1BD03-E" file. Format: .r The literature review followed the “Guidelines for systematic review in conservation and environmental management”, proposed by: Pullin AS, Stewart GB (2006) Guidelines for Systematic Review in Conservation And Environmental Management. Conservation Biology 20(6):1647–1656. https://doi.org/10.1111/j.1523-1739.2006.00485.x Databases used were ISI Web of Knowledge (ISI 2022), SCOPUS Preview (SCOPUS 2022) and Scholar Google (Scholar 2022). For the systematic review: Only papers whose predators were cats and rodents (rats and mice) were chosen for the review. After the search, it was excluded from the review the papers that did not meet the five exclusion criteria: (1) duplicate studies; (2) articles where the prey was not a seabird; (3) studies whose predators were not cats, rats and mice; (4) studies that did not analyze or discuss the effects of predator management or control on reproductive success; and (5) review papers. For the meta-analysis: Only articles containing quantitative data on the reproductive success (percentage of nests with reproductive success in relation to the total number of evaluated nests), both in the absence and in the presence of predator control, were chosen. When the reproductive success metric was not available in the text, we contacted the authors requesting information on the mean and standard deviation of nest success.</p>',
        ),
      },
      authors: [{ name: 'Cynthia Campolina', orcid: OrcidId.OrcidId('0000-0002-8440-2458') }],
      id: new Datasets.ScieloDatasetId({ value: Doi.Doi('10.48331/scielodata.vffsop') }),
      posted: Temporal.PlainDate.from({ year: 2024, month: 11, day: 4 }),
      title: {
        text: rawHtml(
          'Data for: Predation effect by cats and rodents on the reproductive success of seabirds: a systematic review and meta-analysis',
        ),
        language: 'en',
      },
      url: new URL('https://data.scielo.org/citation?persistentId=doi:10.48331/SCIELODATA.VFFSOP'),
    }),
  },
  {
    response: 'scielo-data-portuguese',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'pt',
        text: rawHtml(
          '<p>O trabalho analisou o efeito das Consultas Públicas (CP) e suas contribuições nas recomendações da Comissão Nacional de Incorporação de Tecnologias (CONITEC). Trata-se de estudo descritivo e retrospectivo, com abordagem qualiquantitativa, com fonte de dados secundárias de acesso público, entre 2012 e 2017. Elaborou-se banco de dados para caracterizar as CP de medicamentos e suas contribuições, o que permitiu identificar casos de reversões entre a recomendação preliminar e final da CONITEC.</p>',
        ),
      },
      authors: [
        { name: 'Rondineli Mendes da Silva', orcid: OrcidId.OrcidId('0000-0002-6243-5179') },
        { name: 'Sarah Gomes Pitta Lopes' },
        { name: 'Vera Lúcia Luiza', orcid: OrcidId.OrcidId('0000-0001-6245-7522') },
      ],
      id: new Datasets.ScieloDatasetId({ value: Doi.Doi('10.48331/scielodata.4sp3xa') }),
      posted: Temporal.PlainDate.from({ year: 2022, month: 10, day: 7 }),
      title: {
        text: rawHtml(
          'Data for: Reversão das recomendações emitidas pela Comissão Nacional de Incorporação de Tecnologias no SUS após Consultas Públicas',
        ),
        language: 'pt',
      },
      url: new URL('https://data.scielo.org/citation?persistentId=doi:10.48331/SCIELODATA.4SP3XA'),
    }),
  },
  {
    response: 'scielo-data-spanish',
    expected: new Datasets.Dataset({
      abstract: {
        language: 'es',
        text: rawHtml(
          '<p>El propósito de este estudio fue identificar y analizar los factores que influyen en la adherencia a la rehabilitación en el hogar, desde la percepción de usuarios y sus terapeutas en un centro comunitario de rehabilitación del sur de Chile. Se desarrolló bajo un paradigma cualitativo interpretativo, con diseño fenomenológico empírico, orientado a comprender las experiencias y significados atribuidos al proceso terapéutico y a la ejecución de indicaciones domiciliarias. La muestra fue intencionada e incluyó 7 usuarios (en dos casos participaron cuidadores) y 7 profesionales del equipo de neurorrehabilitación (fonoaudiología, kinesiología y terapia ocupacional), quienes generaron un total de 19 entrevistas. Los criterios de selección de usuarios consideraron un tiempo mínimo de permanencia de seis meses en el centro y atención por al menos dos terapeutas. La recolección de datos se efectuó entre enero y mayo de 2023 mediante entrevistas semiestructuradas validadas por jueces expertos, compuestas por 15 preguntas abiertas. Las entrevistas, realizadas en modalidad presencial y en línea, fueron grabadas, transcritas literalmente y codificadas para resguardar el anonimato, previa firma de consentimiento informado y aprobación por comité de ética. El análisis se realizó mediante análisis de contenido, apoyado en una matriz temática construida a partir de los objetivos del estudio. Se efectuó una lectura comprensiva, identificación de unidades de sentido y generación progresiva de categorías y subcategorías. El proceso permitió organizar los hallazgos en cuatro dimensiones analíticas: comunicación y seguimiento, factores personales, contextuales y materiales.</p>',
        ),
      },
      authors: [
        { name: 'Daniel Rodríguez', orcid: OrcidId.OrcidId('0000-0003-2370-6543') },
        { name: 'Lisette Fuentes-Ugarte', orcid: OrcidId.OrcidId('0000-0002-7555-3019') },
        { name: 'Leonardo Cuevas-Zepeda', orcid: OrcidId.OrcidId('0000-0002-1310-1850') },
        { name: 'Karina Hunter-Echeverría', orcid: OrcidId.OrcidId('0000-0003-0681-6257') },
        { name: 'Noelia Figueroa Burdiles', orcid: OrcidId.OrcidId('0000-0001-7874-004X') },
      ],
      id: new Datasets.ScieloDatasetId({ value: Doi.Doi('10.48331/scielodata.v2hjje') }),
      posted: Temporal.PlainDate.from({ year: 2026, month: 2, day: 27 }),
      title: {
        text: rawHtml(
          'Datos de replicación para: Percepción de los usuarios y sus terapeutas sobre los factores que interfieren en la adherencia terapéutica en el hogar',
        ),
        language: 'es',
      },
      url: new URL('https://data.scielo.org/citation?persistentId=doi:10.48331/SCIELODATA.V2HJJE'),
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
  }).pipe(Effect.provide([NodeFileSystem.layer, LanguageDetection.layerCld]), EffectTest.run),
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
  }).pipe(Effect.provide([NodeFileSystem.layer, Layer.mock(LanguageDetection.LanguageDetection, {})]), EffectTest.run),
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
  }).pipe(Effect.provide([NodeFileSystem.layer, Layer.mock(LanguageDetection.LanguageDetection, {})]), EffectTest.run),
)
