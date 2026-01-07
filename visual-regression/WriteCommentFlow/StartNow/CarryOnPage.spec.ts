import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import * as Prereviews from '../../../src/Prereviews/index.ts'
import * as Routes from '../../../src/routes.ts'
import { Uuid } from '../../../src/types/index.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import * as _ from '../../../src/WebApp/WriteCommentFlow/StartNow/CarryOnPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.CarryOnPage({
    commentId: Uuid.Uuid('7ad2f67d-dc01-48c5-b6ac-3490d494f67d'),
    nextPage: Routes.WriteCommentEnterComment,
    prereview,
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const prereview = new Prereviews.Prereview({
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
  text: html`<p>
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
    <p>The author declares that they have no competing interests.</p>`,
})
