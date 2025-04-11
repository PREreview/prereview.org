import { FileSystem } from '@effect/platform'
import { NodeFileSystem } from '@effect/platform-node'
import { test } from '@fast-check/jest'
import { expect } from '@jest/globals'
import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Effect, pipe, Schema, Struct } from 'effect'
import { Orcid } from 'orcid-id-ts'
import { workToPreprint } from '../../src/Crossref/Preprint.js'
import { ResponseSchema, Work } from '../../src/Crossref/Work.js'
import { rawHtml } from '../../src/html.js'
import { Preprint } from '../../src/preprint.js'
import * as EffectTest from '../EffectTest.js'

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
      id: { type: 'ssrn', value: Doi('10.2139/ssrn.5186959') },
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
      id: { type: 'neurolibre', value: Doi('10.55458/neurolibre.00031') },
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
        {
          name: 'Sydney L Miles',
          orcid: Orcid('0000-0003-2291-4105'),
        },
        {
          name: 'Dilys Santillo',
          orcid: Orcid('0009-0004-3966-4952'),
        },
        {
          name: 'Vincenzo Torraca',
          orcid: Orcid('0000-0001-7340-0249'),
        },
        {
          name: 'Ana Teresa López Jiménez',
          orcid: Orcid('0000-0002-0289-738X'),
        },
        {
          name: 'Claire Jenkins',
          orcid: Orcid('0000-0001-8600-9169'),
        },
        {
          name: 'Stephen Baker',
          orcid: Orcid('0000-0003-1308-5755'),
        },
        {
          name: 'Kate S Baker',
          orcid: Orcid('0000-0001-5850-1949'),
        },
        {
          name: 'Vanessa Sancho-Shimizu',
          orcid: Orcid('0000-0002-3519-0727'),
        },
        {
          name: 'Kathryn E Holt',
          orcid: Orcid('0000-0003-3949-2471'),
        },
        {
          name: 'Serge Mostowy',
          orcid: Orcid('0000-0002-7286-6503'),
        },
      ],
      id: { type: 'biorxiv', value: Doi('10.1101/2025.02.05.636615') },
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
        {
          name: 'Giovanni Deiana',
          orcid: undefined,
        },
        {
          name: 'Jun He',
          orcid: undefined,
        },
        {
          name: 'Brenda Cabrera-Mendoza',
          orcid: undefined,
        },
        {
          name: 'Roberto Ciccocioppo',
          orcid: undefined,
        },
        {
          name: 'Valerio Napolioni',
          orcid: undefined,
        },
        {
          name: 'Renato Polimanti',
          orcid: Orcid('0000-0003-0745-6046'),
        },
      ],
      id: { type: 'medrxiv', value: Doi('10.1101/2024.05.27.24307989') },
      posted: Temporal.PlainDate.from({ year: 2024, month: 12, day: 15 }),
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
])('turns a Crossref work response into a preprint ($response)', ({ response, expected }) =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString(`test/Crossref/WorkSamples/${response}`)),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Work)))),
      Effect.andThen(Struct.get('message')),
      Effect.andThen(workToPreprint),
    )

    expect(actual).toStrictEqual(expected)
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run),
)

test('returns a specific error for non-Preprint work', () =>
  Effect.gen(function* () {
    const actual = yield* pipe(
      FileSystem.FileSystem,
      Effect.andThen(fs => fs.readFileString('test/Crossref/WorkSamples/csh-press-journal.json')),
      Effect.andThen(Schema.decodeUnknown(Schema.parseJson(ResponseSchema(Work)))),
      Effect.andThen(Struct.get('message')),
      Effect.andThen(workToPreprint),
      Effect.flip,
    )

    expect(actual._tag).toStrictEqual('NotAPreprint')
  }).pipe(Effect.provide(NodeFileSystem.layer), EffectTest.run))
