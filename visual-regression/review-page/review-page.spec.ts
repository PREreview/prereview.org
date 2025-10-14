import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { BiorxivPreprintId, EdarxivPreprintId } from '../../src/Preprints/index.ts'
import { Prereview } from '../../src/Prereviews/index.ts'
import type { Comment } from '../../src/review-page/index.ts'
import { createPage } from '../../src/review-page/review-page.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review,
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with anonymous authors', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: {
      ...review,
      authors: {
        ...review.authors,
        anonymous: 3,
      },
    },
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when in a club', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: { ...review, club: 'hhmi-training-pilot' },
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when it's requested", async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: { ...review, requested: true },
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test("content looks right when it's live", async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: { ...review, live: true },
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with an addendum', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: {
      ...review,
      addendum: html`<p>The 'Competing interests' section should read:</p>
        <p>
          JK, MPC and SK have filed patents on NLR biology. JK and SK receive funding on NLR biology from industry. SK
          cofounded a start-up company (Resurrect Bio Ltd.) on resurrecting disease resistance. MPC has received fees
          from Resurrect Bio Ltd.
        </p>`,
    },
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when it is structured', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review: structuredReview,
    comments: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are comments', async ({ showPage }) => {
  const response = createPage({
    id: 1234,
    locale: DefaultLocale,
    review,
    comments: [comment1, comment2],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const review = new Prereview({
  authors: {
    named: [
      { name: 'James Fraser', orcid: OrcidId('0000-0002-5080-2859') },
      { name: 'Luisa Vasconcelos', orcid: OrcidId('0000-0003-2016-5606') },
      { name: 'Liyi Cheng', orcid: OrcidId('0000-0002-5708-7835') },
      { name: 'Samantha  Lish', orcid: OrcidId('0000-0003-0060-1458') },
      { name: 'S. Chan Baek', orcid: OrcidId('0009-0004-3002-8888') },
      { name: 'Lang Ding', orcid: OrcidId('0000-0002-5365-9445') },
      { name: 'Alexandra Probst', orcid: OrcidId('0000-0001-8389-8159') },
      { name: 'Naiya Phillips', orcid: OrcidId('0000-0003-1836-5182') },
      { name: 'William Grubbe', orcid: OrcidId('0000-0002-4933-2626') },
    ],
    anonymous: 0,
  },
  doi: Doi('10.5281/zenodo.10779310'),
  id: 10779310,
  language: 'en',
  license: 'CC-BY-4.0',
  live: false,
  published: Temporal.PlainDate.from('2024-03-04'),
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2023.12.21.572824') }),
    title: html`Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants`,
    language: 'en',
    url: new URL('https://biorxiv.org/lookup/doi/10.1101/2023.12.21.572824'),
  },
  requested: false,
  structured: false,
  text: html`
    <p>
      The SARS-CoV-2 virus has experienced tremendous selective pressure over the course of the global pandemic with
      variants of concern emerging that differ in terms of transmissibility, immunogenicity, and other properties. The
      major goal of this paper is to determine how sequence changes in the major determinant of these properties, the
      Spike protein, affect structure, abundance, and distribution of the virion. In contrast to most previous studies,
      which use purified Spike that isn’t anchored to the virus surface (or even a mimic of the virus surface or a
      biological environment), this study uses electron microscopy/tomography to visualize structures in a more native
      context. The major potential areas of improvement of the paper are the lack of quantitative comparisons to the
      “meta ensemble” of structures determined by other methods (single particle EM, X-ray, etc) and the limited
      discussion of the immune evasion properties of the variant structures with regard to antibody binding footprints.
      It ends with a potential mechanism for how the conformational equilibrium of certain conformations needed for
      fusion are favored by specific amino acid changes and argues, quite convincingly, that the insights from the
      <i>in situ</i> structures determined here are less biased in determining such changes. The manuscript therefore
      succeeds in its major goals - and points to complex interdependencies of different properties in evolution and not
      a single conformational coordinate as the result of the selective pressure.
    </p>
    <p>Major points:</p>
    <ul>
      <li>
        <p>
          The paper begins with some variation in Furin cleavage and is mostly concerned with structural analysis, but
          the link between the biochemical properties and the structural/flexibility parameters uncovered is unclear.
          Furthermore the acronym FPPR is only defined in the Supplementary Figure 1 and the potential importance of the
          proximal peptide needs a bit more introduction to enable the reader to follow the arguments in the paper.
        </p>
      </li>
      <li>
        <p>
          Figure 2d is very tantalizing and potentially shows a simple property that is changing through time. Given
          that the caveats of small n are already noted in the manuscript, more speculation about the figure’s
          interpretation could be interesting. It would be good to elaborate in that discussion beyond: “a comparative
          statistical analysis between strains was not performed, because we cannot take possible variation between
          virus preparations into account.“ For example, were there notable differences in the preparation?
        </p>
      </li>
      <li>
        <p>
          Figure 3 focuses on the trimeric structure and identifying key sites - however, it might be useful for colors
          to be consistent across figures 3a and 3b . This would make the domains easier to structurally identify, and
          help the reader to associate domains (cleavage site, NTD, RBD, etc.) with the interpretation of the next
          couple of figures.
        </p>
      </li>
      <li>
        <p>
          Figure 4 details the structural comparison among variants at the NTD and RBD. It appears that the authors used
          the same global structural alignment as in figure 3, which may not be the optimal choice to examine local
          structural variations because overall domain shifts may interfere with the comparison. In addition, no
          reference or PDB code was included for the reference structure with linoleic acid.
        </p>
      </li>
    </ul>
    <p>Minor point:</p>
    <ul>
      <li>
        <p>
          We are confused as to whether they use B.1 as WT interchangeably in the manuscript. More precision in word
          choice would avoid some confusion with the figure 1 legend as comparisons also mention WT. In the legend for
          figure 1, the stats reference comparisons to WT, but some only have B.1 and not WT labels.
        </p>
      </li>
      <li><p>coulombic potential density (or potential density or density) not electron density</p></li>
      <li><p>In figure 2c, consider adding a legend that specifies red is prefusion and black is postfusion.</p></li>
    </ul>
    <h2>Competing interests</h2>
    <p>The author declares that they have no competing interests.</p>
    <h2>Use of Artificial Intelligence (AI)</h2>
    <p>The authors declare that they did not use generative AI to come up with new ideas for their review.</p>
  `,
})

const structuredReview = new Prereview({
  authors: {
    named: [{ name: 'Justice Nyakura', orcid: OrcidId('0000-0003-1065-1950') }],
    anonymous: 0,
  },
  doi: Doi('10.5281/zenodo.10775334'),
  id: 10775334,
  language: 'en',
  license: 'CC-BY-4.0',
  live: false,
  published: Temporal.PlainDate.from('2024-03-03'),
  preprint: {
    id: new EdarxivPreprintId({ value: Doi('10.35542/osf.io/hsnke') }),
    title: html`A population perspective on international students in Australian universities`,
    language: 'fr',
    url: new URL('https://osf.io/hsnke'),
  },
  requested: false,
  structured: true,
  text: html`
    <dl>
      <dt>Does the introduction explain the objective of the research presented in the preprint?</dt>
      <dd>Yes</dd>
      <dt>Are the methods well-suited for this research?</dt>
      <dd>Somewhat appropriate</dd>
      <dt>Are the conclusions supported by the data?</dt>
      <dd>Somewhat supported</dd>
      <dd>Including a 5-10years trend of the data would have supported the conclusions</dd>
      <dt>Are the data presentations, including visualizations, well-suited to represent the data?</dt>
      <dd>Somewhat appropriate and clear</dd>
      <dd>
        Suited indeed, but one is left with questions whether the noted differences were statistically significant
      </dd>
      <dt>
        How clearly do the authors discuss, explain, and interpret their findings and potential next steps for the
        research?
      </dt>
      <dd>Somewhat clearly</dd>
      <dd>
        Adding next step of future research to look at the employment status will assist in looking at the potential
        impact
      </dd>
      <dt>Is the preprint likely to advance academic knowledge?</dt>
      <dd>Highly likely</dd>
      <dd>
        This is a good research paper looking at whether the level of education given is contributing to global equity
      </dd>
      <dt>Would it benefit from language editing?</dt>
      <dd>No</dd>
      <dt>Would you recommend this preprint to others?</dt>
      <dd>Yes, it’s of high quality</dd>
      <dt>Is it ready for attention from an editor, publisher or broader audience?</dt>
      <dd>Yes, as it is</dd>
    </dl>
    <h2>Competing interests</h2>
    <p>The author declares that they have no competing interests.</p>
    <h2>Use of Artificial Intelligence (AI)</h2>
    <p>The author declares that they did not use generative AI to come up with new ideas for their review.</p>
  `,
})

const comment1 = {
  authors: {
    named: [{ name: 'Josiah Carberry', orcid: OrcidId('0000-0002-1825-0097') }, { name: 'Orange Panda' }],
  },
  doi: Doi('10.5281/zenodo.10779311'),
  language: 'en',
  license: 'CC-BY-4.0',
  id: 10779310,
  published: Temporal.PlainDate.from('2024-03-09'),
  text: html`<p>This is a comment.</p>`,
} satisfies Comment

const comment2 = {
  authors: {
    named: [{ name: 'Arne Saknussemm' }],
  },
  doi: Doi('10.5281/zenodo.10779312'),
  language: 'is',
  license: 'CC-BY-4.0',
  id: 10779310,
  published: Temporal.PlainDate.from('2024-04-15'),
  text: html`<p>Þetta er athugasemd.</p>`,
} satisfies Comment
