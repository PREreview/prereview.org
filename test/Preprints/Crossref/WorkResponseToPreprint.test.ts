import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Struct } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { Crossref } from '../../../src/ExternalApis/index.js'
import { rawHtml } from '../../../src/html.js'
import { Preprint } from '../../../src/preprint.js'
import { workToPreprint } from '../../../src/Preprints/Crossref/Preprint.js'
import {
  BiorxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  NeurolibrePreprintId,
  OsfPreprintsPreprintId,
  PreprintsorgPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
  SsrnPreprintId,
  VerixivPreprintId,
} from '../../../src/Preprints/index.js'
import * as EffectTest from '../../EffectTest.js'

test.each([
  {
    response: 'ssrn.json',
    expected: Preprint({
      authors: [
        { name: 'Kazuaki Nagasaka', orcid: undefined },
        { name: 'Yuto Ogawa', orcid: undefined },
        { name: 'Daisuke Ishii', orcid: undefined },
        { name: 'Ayane Nagao', orcid: undefined },
        { name: 'Hitomi Ikarashi', orcid: undefined },
        { name: 'Naofumi Otsuru', orcid: undefined },
        { name: 'Hideaki Onishi', orcid: undefined },
      ],
      id: new SsrnPreprintId({ value: Doi('10.2139/ssrn.5186959') }),
      posted: 2025,
      title: {
        language: 'en',
        text: rawHtml(
          'Enhanced Flavoprotein Autofluorescence Imaging in Rats Using a Combination of Thin Skull Window and Skull-Clearing Reagents',
        ),
      },
      url: new URL('https://www.ssrn.com/abstract=5186959'),
    }),
  },
  {
    response: 'neurolibre.json',
    expected: Preprint({
      authors: [
        { name: 'Evelyn McLean', orcid: undefined },
        { name: 'Jane Abdo', orcid: undefined },
        { name: 'Nadia Blostein', orcid: Orcid('0000-0002-1864-1899') },
        { name: 'Nikola Stikov', orcid: Orcid('0000-0002-8480-5230') },
      ],
      id: new NeurolibrePreprintId({ value: Doi('10.55458/neurolibre.00031') }),
      posted: Temporal.PlainDate.from({ year: 2024, month: 12, day: 15 }),
      title: {
        language: 'en',
        text: rawHtml('Little Science, Big Science, and Beyond: How Amateurs\nShape the Scientific Landscape'),
      },
      url: new URL('https://neurolibre.org/papers/10.55458/neurolibre.00031'),
    }),
  },
  {
    response: 'biorxiv.json',
    expected: Preprint({
      authors: [
        { name: 'Sydney L Miles', orcid: Orcid('0000-0003-2291-4105') },
        { name: 'Dilys Santillo', orcid: Orcid('0009-0004-3966-4952') },
        { name: 'Vincenzo Torraca', orcid: Orcid('0000-0001-7340-0249') },
        { name: 'Ana Teresa López Jiménez', orcid: Orcid('0000-0002-0289-738X') },
        { name: 'Claire Jenkins', orcid: Orcid('0000-0001-8600-9169') },
        { name: 'Stephen Baker', orcid: Orcid('0000-0003-1308-5755') },
        { name: 'Kate S Baker', orcid: Orcid('0000-0001-5850-1949') },
        { name: 'Vanessa Sancho-Shimizu', orcid: Orcid('0000-0002-3519-0727') },
        { name: 'Kathryn E Holt', orcid: Orcid('0000-0003-3949-2471') },
        { name: 'Serge Mostowy', orcid: Orcid('0000-0002-7286-6503') },
      ],
      id: new BiorxivPreprintId({ value: Doi('10.1101/2025.02.05.636615') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 2, day: 5 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Enhanced virulence and stress tolerance are signatures of epidemiologically successful<i>Shigella sonnei</i>',
        ),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Shigellosis is a leading cause of diarrhoeal deaths worldwide, with<i>Shigella sonnei</i>increasingly implicated as a dominant agent.<i>S. sonnei</i>is divided into five monophyletic lineages all sharing a single O-antigen, yet most contemporary infections are caused by just a few clonal sub-lineages within globally dominant Lineage 3 that are quite distinct from the widely used Lineage 2 laboratory strain 53G. Factors underlying the success of these globally dominant lineages remain poorly understood in part due to a lack of complete genome sequences and available animal models. Here, we utilise a novel reference collection of representative Lineage 1, 2 and 3 isolates with complete genome sequences, and find that epidemiologically successful<i>S. sonnei</i>harbour fewer genes encoding putative immunogenic components whilst key virulence-associated regions (such as the type three secretion system and O-antigen) remain highly conserved. Using a zebrafish infection model, we discover that Lineage 3 isolates are most virulent, driven by significantly increased dissemination and a greater neutrophil response. We show that Lineage 3 isolates have increased tolerance to complement-mediated killing and acidic conditions alongside upregulated expression of group four capsule synthesis genes. Consistent with these observations, infection of primary human neutrophils revealed that Lineage 3 isolates are more tolerant of phagosomal killing. Together, our findings link the epidemiological success of<i>S. sonnei</i>to heightened virulence and stress tolerance and highlight zebrafish as a valuable platform to illuminate factors underlying establishment of<i>Shigella</i>epidemiological success.</p>',
        ),
      },
      url: new URL('https://biorxiv.org/lookup/doi/10.1101/2025.02.05.636615'),
    }),
  },
  {
    response: 'medrxiv.json',
    expected: Preprint({
      authors: [
        { name: 'Giovanni Deiana', orcid: undefined },
        { name: 'Jun He', orcid: undefined },
        { name: 'Brenda Cabrera-Mendoza', orcid: undefined },
        { name: 'Roberto Ciccocioppo', orcid: undefined },
        { name: 'Valerio Napolioni', orcid: undefined },
        { name: 'Renato Polimanti', orcid: Orcid('0000-0003-0745-6046') },
      ],
      id: new MedrxivPreprintId({ value: Doi('10.1101/2024.05.27.24307989') }),
      posted: Temporal.PlainDate.from({ year: 2024, month: 5, day: 28 }),
      title: {
        language: 'en',
        text: rawHtml('Brain-wide pleiotropy investigation of alcohol drinking and tobacco smoking behaviors'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>To investigate the pleiotropic mechanisms linking brain structure and function to alcohol drinking and tobacco smoking, we integrated genome-wide data generated by the GWAS and Sequencing Consortium of Alcohol and Nicotine use (GSCAN; up to 805,431 participants) with information related to 3,935 brain imaging-derived phenotypes (IDPs) available from UK Biobank (N=33,224). We observed global genetic correlation of smoking behaviors with white matter hyperintensities, the morphology of the superior longitudinal fasciculus, and the mean thickness of pole-occipital. With respect to the latter brain IDP, we identified a local genetic correlation with age at which the individual began smoking regularly (hg38 chr2:35,895,678-36,640,246: rho=1, p=1.01×10<sup>−5</sup>). This region has been previously associated with smoking initiation, educational attainment, chronotype, and cortical thickness. Our genetically informed causal inference analysis using both latent causal variable approach and Mendelian randomization linked the activity of prefrontal and premotor cortex and that of superior and inferior precentral sulci, and cingulate sulci to the number of alcoholic drinks per week (genetic causality proportion, gcp=0.38, p=8.9×10<sup>−4</sup>, rho=-0.18±0.07; inverse variance weighting, IVW beta=-0.04, 95%CI=-0.07 – −0.01). This relationship could be related to the role of these brain regions in the modulation of reward-seeking motivation and the processing of social cues. Overall, our brain-wide investigation highlighted that different pleiotropic mechanisms likely contribute to the relationship of brain structure and function with alcohol drinking and tobacco smoking, suggesting decision-making activities and chemosensory processing as modulators of propensity towards alcohol and tobacco consumption.</p>',
        ),
      },
      url: new URL('https://medrxiv.org/lookup/doi/10.1101/2024.05.27.24307989'),
    }),
  },
  {
    response: 'scielo-preprints-english.json',
    expected: Preprint({
      authors: [
        { name: 'Vinicius Rofatto', orcid: Orcid('0000-0003-1453-7530') },
        { name: 'Ivandro Klein', orcid: Orcid('0000-0003-4296-592X') },
        { name: 'Marcelo Tomio Matsuoka', orcid: undefined },
        { name: 'Paulo de Oliveira Camargo', orcid: Orcid('0000-0003-0892-9175') },
        { name: 'Mauricio Roberto Veronez', orcid: undefined },
        { name: 'Luiz Gonzaga Jr', orcid: Orcid('0000-0002-7661-2447') },
        { name: 'Lincon Rodrigues Silva', orcid: Orcid('0009-0000-5951-4434') },
      ],
      id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.11415') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 3, day: 10 }),
      title: {
        language: 'en',
        text: rawHtml(
          'SeqCup-Free: Sequential and Combinatorial Geometry-Free Identification of Unstable Points for Geodetic Deformation Monitoring',
        ),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Congruence analysis is widely used to monitor structural stability through statistical analysis of differences in estimated coordinates of geodetic network points across observation epochs. Traditional methods for the identification of unstable points rely on either iterative hypothesis tests or combinatorial procedures, each with inherent limitations. To overcome these, we propose the Sequential and Combinatorial Geometry-Free Unstable Point Identification (SeqCup-Free) method, which integrates combinatorial analysis and likelihood ratio tests within a sequential framework. Unlike conventional approaches, SeqCup-Free uses observation differences instead of estimated coordinates, which removes the need for geodetic network datum definition and maintains the statistical power of hypothesis tests. Additionally, we introduce a modified version, SeqCup-Mod, which extends the method to non-nested hypothesis tests and achieves high success rates. A critical aspect of our approach is the definition of the maximum number of points considered unstable, which avoids statistical overlap while allowing the system to detect the maximum possible displacements. Results from simulations and real geodetic network data show that SeqCup-Free provides consistent and, in some cases, superior performance compared to classical and recent methods in deformation monitoring.</p>',
        ),
      },
      url: new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/11415/version/12033'),
    }),
  },
  {
    response: 'scielo-preprints-portuguese.json',
    expected: Preprint({
      authors: [
        { name: 'Elodia Honse Lebourg', orcid: undefined },
        { name: 'Rosa Maria Da Exaltação Coutrim', orcid: Orcid('0000-0002-9510-1263') },
      ],
      id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.11538') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 4, day: 11 }),
      title: {
        language: 'pt',
        text: rawHtml(
          'Experiências de socialização de jovens atingidos pelo rompimento da Barragem de Fundão (Mariana, Minas Gerais, Brasil)',
        ),
      },
      abstract: {
        language: 'pt',
        text: rawHtml(
          '<p>No dia 5 de novembro de 2015, o rompimento da Barragem de Fundão, operada pela Samarco Mineração e por suas controladoras, Vale e BHP, em Mariana-MG, representou o início de um desastre sem precedentes na história brasileira. Neste artigo, analisamos como foram afetados os processos de socialização de jovens dos subdistritos de Bento Rodrigues, Paracatu de Baixo e Camargos matriculados no Ensino Médio em escolas de Mariana-MG e Ouro Preto-MG. Teoricamente, o estudo se referenciou na Sociologia da Educação, na Sociologia das Juventudes e na Sociologia dos Desastres. A pesquisa foi realizada por meio de análise bibliográfica, documental e trabalho de campo, a partir de 12 entrevistas interpretadas com perfis de configuração. Constatou-se que os laços de amizade que os entrevistados mantinham nos territórios de origem foram fragilizados. Após a chegada à juventude e o ingresso no Ensino Médio, criaram novos vínculos, acessaram mais as redes sociais digitais, começaram a projetar seus futuros e suas famílias continuaram sendo uma base importante. A pandemia de COVID-19 desorganizou seus laços de sociabilidade, aumentou as interações digitais e piorou sua condição mental. Eles tiveram de conviver com preconceito e estigmatização. Para se preservarem, muitos se isolavam e não contavam que eram pessoas atingidas. Os resultados da pesquisa demonstraram que as experiências socializadoras desses jovens estavam ocorrendo em um contexto complexo e traumático que impactava negativamente suas formas de ser e estar no mundo.</p>',
        ),
      },
      url: new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/11538/version/12162'),
    }),
  },
  {
    response: 'scielo-preprints-spanish.json',
    expected: Preprint({
      authors: [
        { name: 'Luis Alejandro Andrade Dorado', orcid: Orcid('0000-0002-2731-6908') },
        { name: 'Jesús Antonio Castillo Franco', orcid: undefined },
      ],
      id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.11386') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 3, day: 18 }),
      title: {
        language: 'es',
        text: rawHtml(
          'Respuesta del cultivo de maíz (zea mays) a la aplicación de abono orgánico en la vereda Meneses, municipio de Buesaco, Nariño, Colombia',
        ),
      },
      abstract: {
        language: 'es',
        text: rawHtml(
          '<p>Esta investigación se realizó en el municipio de Buesaco- Nariño, tiene como objetivo comparar el rendimiento del cultivo de maíz (Zea maíz) en un área total de 448m2 con 480 plántulas, con dos dosis con el propósito de tener un rango mínimo y uno máximo como referencia. Consta de cuatro Tratamientos y cuatro repeticiones, el primero Tratamiento es el testigo, el segundo la tierra de montaña, el tercero el abono orgánico, y el cuarto el abono químico, en un cultivo dividido en cuatro repeticiones. Midiendo también variables como la altura, el diámetro y el área foliar de la planta. Obteniendo como resultados generales que las variables no presentan diferencias significativas, no obstante al ser una investigación semi-experimental, los datos obtenidos solo pueden ser tomados como una aproximación para entender el comportamiento de este cultivo para esta zona de la región.</p>',
        ),
      },
      url: new URL('https://preprints.scielo.org/index.php/scielo/preprint/view/11386/version/12000'),
    }),
  },
  {
    response: 'preprintsorg.json',
    expected: Preprint({
      authors: [
        { name: 'Matthew T.J. Halma', orcid: undefined },
        { name: 'Cristof Plothe', orcid: undefined },
        { name: 'Theresa Lawrie', orcid: undefined },
      ],
      id: new PreprintsorgPreprintId({ value: Doi('10.20944/preprints202303.0344.v1') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 3, day: 20 }),
      title: {
        language: 'en',
        text: rawHtml('Strategies for the Management of Spike Protein-Related Pathology'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>In the wake of the Covid-19 crisis, a need has arisen to prevent and treat two related conditions, Covid vaccine injury and long Covid, both of which have a significant vascular component. Therefore, the management of these conditions require the development of strategies to prevent or dissolve blood clots and restore circulatory health. This review summarizes the evidence on strategies that can be applied to treat both long and vaccine injuries based on similar mechanisms of action.</p>',
        ),
      },
      url: new URL('https://www.preprints.org/manuscript/202303.0344/v1'),
    }),
  },
  {
    response: 'verixiv.json',
    expected: Preprint({
      authors: [
        { name: 'Zachary Thomas Stavrou–Dowd', orcid: Orcid('0000-0002-0323-8896') },
        { name: 'Clair Rose', orcid: undefined },
        { name: 'Álvaro Acosta-Serrano', orcid: Orcid('0000-0002-2576-7959') },
        { name: 'Lee Rafuse Haines', orcid: Orcid('0000-0001-8821-6479') },
      ],
      id: new VerixivPreprintId({ value: Doi('10.12688/verixiv.54.1') }),
      posted: Temporal.PlainDate.from({ year: 2024, month: 8, day: 29 }),
      title: {
        language: 'en',
        text: rawHtml('Design and validation of a low-cost sugar-feeder for resource-poor insectaries'),
      },
      url: new URL('https://verixiv.org/articles/1-7/v1'),
    }),
  },
  {
    response: 'biorxiv-group-author.json',
    expected: Preprint({
      authors: [
        { name: 'Gina M. Many', orcid: Orcid('0000-0003-4779-1690') },
        { name: 'Tyler J Sagendorf', orcid: Orcid('0000-0003-1552-4870') },
        { name: 'Hugh Mitchell', orcid: undefined },
        { name: 'James A Sanford', orcid: Orcid('0000-0001-7901-5579') },
        { name: 'Samuel Cohen', orcid: undefined },
        { name: 'Ravi Misra', orcid: undefined },
        { name: 'Igor Estevao', orcid: undefined },
        { name: 'Ivo Díaz Ludovico', orcid: undefined },
        { name: 'David A Gaul', orcid: Orcid('0000-0002-9308-1895') },
        { name: 'Malene E Lindholm', orcid: Orcid('0000-0002-5763-7833') },
        { name: 'Mereena Ushakumary', orcid: undefined },
        { name: 'James Pino', orcid: undefined },
        { name: 'Nicholas Musi', orcid: undefined },
        { name: 'Jia Nie', orcid: undefined },
        { name: 'Facundo M Fernández', orcid: Orcid('0000-0002-0302-2534') },
        { name: 'Eric A Ortlund', orcid: Orcid('0000-0001-8855-3029') },
        { name: 'Karyn A. Esser', orcid: Orcid('0000-0002-5791-1441') },
        { name: 'Sue C Bodine', orcid: undefined },
        { name: 'Simon Schenk', orcid: undefined },
        { name: 'Geremy Clair', orcid: undefined },
        { name: 'Joshua N Adkins', orcid: Orcid('0000-0003-0399-0700') },
        { name: 'The MoTrPAC Study Group', orcid: undefined },
      ],
      id: new BiorxivPreprintId({ value: Doi('10.1101/2025.04.10.647997') }),
      posted: Temporal.PlainDate.from({ year: 2025, month: 4, day: 16 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Sexually distinct multi-omic responses to progressive endurance exercise training in the rat lung—Findings from MoTrPAC',
        ),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>Despite the lungs being essential for ventilation and aerobic exercise capacity, conventionally the lungs are not thought to adapt to exercise training. Endurance exercise is key to pulmonary rehabilitation programs, which also displays sex-specific differences in therapeutic efficacy. Given the molecular underpinnings of sex-specific lung adaptations to endurance exercise are uncharacterized, we used a multi-omics approach to study sex differences in the lungs of 6-month-old Fischer 344 rats in response to an 8 week progressive endurance treadmill training protocol. This was accomplished by reannotating publicly accessible data from the Molecular Transducers of Physical Activity Consortium (MoTrPAC) and integrating newly-analyzed acetylome data to assess multi-omic sex differences in sedentary and progressively trained states. Female rats displayed enrichment in immune-related features and pathways at the transcriptome and proteome level that were maintained with training. Conversely, in the male rat lung there was an overall decrease in immune pathways following 8 weeks of training. Sexually conserved responses to training included increased enrichment in transcriptomic pathways related to type I alveoli and proteomic pathways related to cilia, and decreased mitochondrial protein acetylation. In both sexes, features known to be enriched in lung diseases were attenuated with training. Together our findings provide novel insight into sex specific responses to endurance exercise training in the rat lung and may offer translational insight into sex-specific differences in lung disease pathogenesis and treatment.</p>',
        ),
      },
      url: new URL('https://biorxiv.org/lookup/doi/10.1101/2025.04.10.647997'),
    }),
  },
  {
    response: 'biorxiv-family-name-only.json',
    expected: Preprint({
      authors: [
        { name: 'Neha', orcid: Orcid('0000-0002-5719-6572') },
        { name: 'Parimal Das', orcid: Orcid('0000-0002-9857-4277') },
      ],
      id: new BiorxivPreprintId({ value: Doi('10.1101/2023.07.06.547934') }),
      posted: Temporal.PlainDate.from({ year: 2023, month: 7, day: 6 }),
      title: {
        language: 'en',
        text: rawHtml(
          'Exploring G-quadruplex structure in<i>PRCC-TFE3</i>fusion Oncogene: Plausible use as anti cancer therapy for translocation Renal cell carcinoma (tRCC)',
        ),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The<i>TFE3</i>fusion gene, byproduct of Xp11.2 translocation, is the diagnostic marker for translocation renal cell carcinoma (tRCC). Absence of any clinically recognized therapy for tRCC, pressing a need to create novel and efficient therapeutic approaches. Previous studies shown that stabilization of the G-quadruplex structure in oncogenes suppresses their expression machinery. To combat the oncogenesis caused by fusion genes, our objective is to locate and stabilize the G-quadruplex structure within the<i>PRCC-TFE3</i>fusion gene. Using the Quadruplex- forming G Rich Sequences (QGRS) mapper and the Non-B DNA motif search tool (nBMST) online server, we found putative G-quadruplex forming sequences (PQS) in the<i>PRCC-TFE3</i>fusion gene. Circular dichroism demonstrating a parallel G-quadruplex in the targeted sequence. Fluorescence and UV-vis spectroscopy results suggest that pyridostatin binds to this newly discovered G-quadruplex. The PCR stop assay, as well as transcriptional or translational inhibition by PQS, revealed that stable G-quadruplex formation affects biological processes. Confocal microscopy of HEK293T cells transfected with the fusion transcript confirmed G- quadruplexes formation in cell. This investigation may shed light on G-quadruplex’s functions in fusion genes and may help in the development of therapies specifically targeted against fusion oncogenes, which would enhance the capability of current tRCC therapy approach.</p>',
        ),
      },
      url: new URL('https://biorxiv.org/lookup/doi/10.1101/2023.07.06.547934'),
    }),
  },
  {
    response: 'research-square.json',
    expected: Preprint({
      authors: [
        { name: 'Shaun Treweek', orcid: Orcid('0000-0002-7239-7241') },
        { name: 'Simon Bevan', orcid: undefined },
        { name: 'Peter Bower', orcid: undefined },
        { name: 'Matthias Briel', orcid: undefined },
        { name: 'Marion Campbell', orcid: undefined },
        { name: 'Jacquie Christie', orcid: undefined },
        { name: 'Clive Collett', orcid: undefined },
        { name: 'Seonaidh Cotton', orcid: undefined },
        { name: 'Declan Devane', orcid: undefined },
        { name: 'Adel El Feky', orcid: undefined },
        { name: 'Sandra Galvin', orcid: undefined },
        { name: 'Heidi Gardner', orcid: undefined },
        { name: 'Katie Gillies', orcid: undefined },
        { name: 'Kerenza Hood', orcid: undefined },
        { name: 'Jan Jansen', orcid: undefined },
        { name: 'Roberta Littleford', orcid: undefined },
        { name: 'Adwoa Parker', orcid: undefined },
        { name: 'Craig Ramsay', orcid: undefined },
        { name: 'Lynne Restrup', orcid: undefined },
        { name: 'Frank Sullivan', orcid: undefined },
        { name: 'David Torgerson', orcid: undefined },
        { name: 'Liz Tremain', orcid: undefined },
        { name: 'Erik von Elm', orcid: undefined },
        { name: 'Matthew Westmore', orcid: undefined },
        { name: 'Hywel Williams', orcid: undefined },
        { name: 'Paula R Williamson', orcid: undefined },
        { name: 'Mike Clarke', orcid: undefined },
      ],
      id: new ResearchSquarePreprintId({ value: Doi('10.21203/rs.1.1/v2') }),
      posted: Temporal.PlainDate.from({ year: 2019, month: 10, day: 9 }),
      title: {
        language: 'en',
        text: rawHtml('Trial Forge Guidance 2: How to decide if a further Study Within A Trial (SWAT) is needed'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '\n        <p>The evidence base available to trialists to support trial process decisions– e.g. how best to recruit and retain participants, how to collect data or how to share the results with participants – is thin. One way to fill gaps in evidence is to run Studies Within A Trial, or SWATs. These are self-contained research studies embedded within a host trial that aim to evaluate or explore alternative ways of delivering or organising a particular trial process. SWATs are increasingly being supported by funders and considered by trialists, especially in the UK and Ireland. At some point, increasing SWAT evidence will lead funders and trialists to ask : given the current body of evidence for a SWAT, do we need a further evaluation in a another host trial? A framework for answering such a question is needed to avoid SWATs themselves contributing to research waste. This paper presents criteria on when enough evidence is available for SWATs that use randomised allocation to compare different interventions.</p>',
        ),
      },
      url: new URL('https://www.researchsquare.com/article/rs-2/v2'),
    }),
  },
  {
    response: 'metaarxiv.json',
    expected: Preprint({
      authors: [
        { name: 'Garret Christensen', orcid: undefined },
        { name: 'Edward Miguel', orcid: undefined },
      ],
      id: new MetaarxivPreprintId({ value: Doi('10.31222/osf.io/9a3rw') }),
      posted: Temporal.PlainDate.from({ year: 2017, month: 3, day: 3 }),
      title: {
        language: 'en',
        text: rawHtml('Transparency, Reproducibility, and the Credibility of Economics Research'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>There is growing interest in enhancing research transparency and reproducibility in economics and other scientific fields. We survey existing work on these topics within economics, and discuss the evidence suggesting that publication bias, inability to replicate, and specification searching remain widespread in the discipline. We next discuss recent progress in this area, including through improved research design, study registration and pre-analysis plans, disclosure standards, and open sharing of data and materials, drawing on experiences in both economics and other social sciences. We discuss areas where consensus is emerging on new practices, as well as approaches that remain controversial, and speculate about the most effective ways to make economics research more credible in the future.</p>',
        ),
      },
      url: new URL('https://osf.io/9a3rw'),
    }),
  },
  {
    response: 'socarxiv.json',
    expected: Preprint({
      authors: [{ name: 'Paula Sequeiros', orcid: Orcid('0000-0003-2069-5631') }],
      id: new SocarxivPreprintId({ value: Doi('10.31235/osf.io/ny6h2') }),
      posted: Temporal.PlainDate.from({ year: 2022, month: 11, day: 26 }),
      title: {
        language: 'pt',
        text: rawHtml('Um tambor sámi restituído: culturas originárias europeias e colonialismo no Ártico'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>The restitution of a Sámi drum confiscated in 1691 in Karasjok, present-day  Norway, was made in early 2022. This good incorporates historical meaning, culture and own values as well as marks of colonization and inequalities in Sápmi. It can talk about the long coloniality and racist invisibilization in the far north of Europe and about the historical resistances and current processes for justice andreparation. A bibliographical synthesis is presented on the Eurocentric invention of races operated from the center of Europe in which it aimed particularly at the Sámi populations, their lands and cultures, with colonial, patriarchal and capacitist demarcations. Possible lines of intervention and reconfiguration of the work on biographical and bibliographical sources that sustain, encourage anddisseminate the incorporation of knowledge inherited and to be passed on by originary cultures with recognition and justice.</p>',
        ),
      },
      url: new URL('https://osf.io/ny6h2'),
    }),
  },
  {
    response: 'osf-preprints.json',
    expected: Preprint({
      authors: [{ name: 'Tran Duc Hung Long', orcid: undefined }],
      id: new OsfPreprintsPreprintId({ value: Doi('10.31219/osf.io/t9gbj') }),
      posted: Temporal.PlainDate.from({ year: 2021, month: 10, day: 11 }),
      title: {
        language: 'vi',
        text: rawHtml('Quy hoạch di sản: Một góc nhìn từ Hội An'),
      },
      abstract: {
        language: 'en',
        text: rawHtml(
          '<p>This article takes a look at the state of preservation in Hoi An, which is a world heritage and a famous tourist attraction in central Vietnam.</p>',
        ),
      },
      url: new URL('https://osf.io/t9gbj'),
    }),
  },
])('turns a Crossref work response into a preprint ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Crossref/WorkSamples/${response}`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Crossref.ResponseSchema(Crossref.Work)))),
      Effect.andThen(Struct.get('message')),
      Effect.andThen(workToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test.each(['csh-press-journal.json', 'f1000.json', 'scielo-journal.json', 'wellcome-open-research.json'])(
  'returns a specific error for non-Preprint work (%s)',
  response =>
    Effect.gen(function* () {
      const actual = yield* pipe(
        FileSystem.FileSystem,
        Effect.andThen(fs => fs.readFileString(`test/ExternalApis/Crossref/WorkSamples/${response}`)),
        Effect.andThen(Schema.decodeUnknown(Schema.parseJson(Crossref.ResponseSchema(Crossref.Work)))),
        Effect.andThen(Struct.get('message')),
        Effect.andThen(workToPreprint),
        Effect.flip,
      )

      expect(actual._tag).toStrictEqual('NotAPreprint')
    }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)
