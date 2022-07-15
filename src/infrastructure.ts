import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { ReaderTaskEither } from 'fp-ts/ReaderTaskEither'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { ReadonlyRecord } from 'fp-ts/ReadonlyRecord'
import * as RR from 'fp-ts/ReadonlyRecord'
import * as TE from 'fp-ts/TaskEither'
import { constant, flow, pipe } from 'fp-ts/function'
import { Orcid } from 'orcid-id-ts'
import {
  DepositMetadata,
  SubmittedDeposition,
  ZenodoAuthenticatedEnv,
  createDeposition,
  publishDeposition,
  uploadFile,
} from 'zenodo-ts'
import { html, plainText } from './html'
import { Preprint } from './preprint'
import { NewPrereview } from './write-review'

import PlainDate = Temporal.PlainDate

export const getPreprint = TE.fromOptionK(constant('not-found'))((doi: Doi) => RR.lookup(doi, preprints))

export const getPreprintTitle = flow(
  getPreprint,
  TE.map(preprint => preprint.title),
)

export const createRecordOnZenodo: (
  newPrereview: NewPrereview,
) => ReaderTaskEither<ZenodoAuthenticatedEnv, unknown, SubmittedDeposition> = newPrereview =>
  pipe(
    createDepositMetadata(newPrereview),
    createDeposition,
    RTE.chainFirst(
      uploadFile({
        name: 'review.html',
        type: 'text/html',
        content: newPrereview.review.toString(),
      }),
    ),
    RTE.chain(publishDeposition),
  )

function createDepositMetadata(newPrereview: NewPrereview): DepositMetadata {
  return {
    upload_type: 'publication',
    publication_type: 'article',
    title: plainText`Review of “${newPrereview.preprint.title}”`.toString(),
    creators: [newPrereview.persona === 'public' ? newPrereview.user : { name: 'PREreviewer' }],
    description: newPrereview.review.toString(),
    communities: [{ identifier: 'prereview-reviews' }],
    related_identifiers: [
      {
        scheme: 'doi',
        identifier: newPrereview.preprint.doi,
        relation: 'reviews',
        resource_type: 'publication-preprint',
      },
    ],
  }
}

const preprints: ReadonlyRecord<string, Preprint> = {
  '10.1101/2021.02.04.21251134': {
    abstract: html`<h4>Background</h4>
      <p>
        Multiple early hospital cohorts of coronavirus disease 2019 (COVID-19) showed that patients with chronic
        respiratory disease were significantly under-represented. We hypothesised that the widespread use of inhaled
        glucocorticoids was responsible for this finding and tested if inhaled glucorticoids would be an effective
        treatment for early COVID-19 illness.
      </p>
      <h4>Methods</h4>
      <p>
        We conducted a randomised, open label trial of inhaled budesonide, compared to usual care, in adults within 7
        days of the onset of mild Covid-19 symptoms. The primary end point was COVID-19-related urgent care visit,
        emergency department assessment or hospitalisation. The trial was stopped early after independent statistical
        review concluded that study outcome would not change with further participant enrolment.
      </p>
      <h4>Results</h4>
      <p>
        146 patients underwent randomisation. For the per protocol population (n=139), the primary outcome occurred in
        10 participants and 1 participant in the usual care and budesonide arms respectively (difference in proportion
        0.131, p=0.004). The number needed to treat with inhaled budesonide to reduce COVID-19 deterioration was 8.
        Clinical recovery was 1 day shorter in the budesonide arm compared to the usual care arm (median of 7 days
        versus 8 days respectively, logrank test p=0.007). Proportion of days with a fever and proportion of
        participants with at least 1 day of fever was lower in the budesonide arm. Fewer participants randomised to
        budesonide had persistent symptoms at day 14 and day 28 compared to participants receiving usual care.
      </p>
      <h4>Conclusion</h4>
      <p>
        Early administration of inhaled budesonide reduced the likelihood of needing urgent medical care and reduced
        time to recovery following early COVID-19 infection.
      </p>
      <p>
        (Funded by Oxford NIHR Biomedical Research Centre and AstraZeneca;
        <a href="http://ClinicalTrials.gov">ClinicalTrials.gov</a>
        number, NCT04416399)
      </p>
      <h4>Research in context</h4>
      <h5>Evidence before this study</h5>
      <p>
        The majority of interventions studied for the COVID-19 pandemic are focused on hospitalised patients. Widely
        available and broadly relevant interventions for mild COVID-19 are urgently needed.
      </p>
      <h5>Added value of this study</h5>
      <p>
        In this open label randomised controlled trial, inhaled budesonide, when given to adults with early COVID-19
        illness, reduces the likelihood of requiring urgent care, emergency department consultation or hospitalisation.
        There was also a quicker resolution of fever, a known poor prognostic marker in COVID-19 and a faster
        self-reported and questionnaire reported symptom resolution. There were fewer participants with persistent
        COVID-19 symptoms at 14 and 28 days after budesonide therapy compared to usual care.
      </p>
      <h5>Implications of all the available evidence</h5>
      <p>
        The STOIC trial potentially provides the first easily accessible effective intervention in early COVID-19. By
        assessing health care resource utilisation, the study provides an exciting option to help with the worldwide
        pressure on health care systems due to the COVID-19 pandemic. Data from this study also suggests a potentially
        effective treatment to prevent the long term morbidity from persistent COVID-19 symptoms.
      </p>`,
    authors: [
      { name: 'Sanjay Ramakrishnan', orcid: '0000-0002-3003-7918' as Orcid },
      { name: 'Dan V. Nicolau Jr.' },
      { name: 'Beverly Langford' },
      { name: 'Mahdi Mahdi' },
      { name: 'Helen Jeffers' },
      { name: 'Christine Mwasuku' },
      { name: 'Karolina Krassowska' },
      { name: 'Robin Fox' },
      { name: 'Ian Binnian' },
      { name: 'Victoria Glover' },
      { name: 'Stephen Bright' },
      { name: 'Christopher Butler' },
      { name: 'Jennifer L Cane' },
      { name: 'Andreas Halner' },
      { name: 'Philippa C Matthews', orcid: '0000-0002-4036-4269' as Orcid },
      { name: 'Louise E Donnelly' },
      { name: 'Jodie L Simpson' },
      { name: 'Jonathan R Baker' },
      { name: 'Nabil T Fadai', orcid: '0000-0001-7717-5421' as Orcid },
      { name: 'Stefan Peterson' },
      { name: 'Thomas Bengtsson' },
      { name: 'Peter J Barnes' },
      { name: 'Richard EK Russell' },
      { name: 'Mona Bafadhel', orcid: '0000-0002-9993-2478' as Orcid },
    ],
    doi: '10.1101/2021.02.04.21251134' as Doi<'1101'>,
    posted: PlainDate.from('2021-02-08'),
    server: 'medRxiv',
    title: html`Inhaled budesonide in the treatment of early COVID-19 illness: a randomised controlled trial`,
    url: new URL('https://www.medrxiv.org/content/10.1101/2021.02.04.21251134v1'),
  },
  '10.1101/2022.01.13.476201': {
    abstract: html`
      <p>
        Non-photochemical quenching (NPQ) is the process that protects photosynthetic organisms from photodamage by
        dissipating the energy absorbed in excess as heat. In the model green alga <i>Chlamydomonas reinhardtii</i>, NPQ
        was abolished in the knock-out mutants of the pigment-protein complexes LHCSR3 and LHCBM1. However, while LHCSR3
        was shown to be a pH sensor and switching to a quenched conformation at low pH, the role of LHCBM1 in NPQ has
        not been elucidated yet. In this work, we combine biochemical and physiological measurements to study short-term
        high light acclimation of <i>npq5</i>, the mutant lacking LHCBM1. We show that while in low light in the absence
        of this complex, the antenna size of PSII is smaller than in its presence, this effect is marginal in high
        light, implying that a reduction of the antenna is not responsible for the low NPQ. We also show that the mutant
        expresses LHCSR3 at the WT level in high light, indicating that the absence of this complex is also not the
        reason. Finally, NPQ remains low in the mutant even when the pH is artificially lowered to values that can
        switch LHCSR3 to the quenched conformation. It is concluded that both LHCSR3 and LHCBM1 need to be present for
        the induction of NPQ and that LHCBM1 is the interacting partner of LHCSR3. This interaction can either enhance
        the quenching capacity of LHCSR3 or connect this complex with the PSII supercomplex.
      </p>
    `,
    authors: [
      { name: 'Xin Liu' },
      { name: 'Wojciech Nawrocki', orcid: '0000-0001-5124-3000' as Orcid },
      { name: 'Roberta Croce', orcid: '0000-0003-3469-834X' as Orcid },
    ],
    doi: '10.1101/2022.01.13.476201' as Doi<'1101'>,
    posted: PlainDate.from('2022-01-14'),
    server: 'bioRxiv',
    title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
    url: new URL('https://www.biorxiv.org/content/10.1101/2022.01.13.476201v1.full'),
  },
  '10.1101/2022.02.14.480364': {
    abstract: html`
      <p>
        BTB domain And CNC Homolog 2 (Bach2) is a transcription repressor that actively participates in T and B
        lymphocyte development, but it is unknown if Bach2 is also involved in the development of innate immune cells,
        such as natural killer (NK) cells. Here, we followed the expression of Bach2 during NK cell development, finding
        that it peaked in CD27<sup>+</sup>CD11b<sup>+</sup> cells and decreased upon further maturation. Bach2
        expression positively correlated with that of the transcription factor TCF1 and negatively correlated with genes
        encoding NK effector molecules as well as genes involved in the cell cycle. Bach2-deficient mice showed
        increased numbers of terminally differentiated NK cells with increased production of granzymes and cytokines. NK
        cell-mediated control of tumor metastasis was also augmented in the absence of Bach2. Therefore, Bach2 is a key
        checkpoint protein regulating NK terminal maturation.
      </p>
    `,
    authors: [
      { name: 'Shasha Li' },
      { name: 'Michael D. Bern' },
      { name: 'Benpeng Miao' },
      { name: 'Takeshi Inoue' },
      { name: 'Sytse J. Piersma', orcid: '0000-0002-5379-3556' as Orcid },
      { name: 'Marco Colonna', orcid: '0000-0001-5222-4987' as Orcid },
      { name: 'Tomohiro Kurosaki', orcid: '0000-0002-6352-304X' as Orcid },
      { name: 'Wayne M. Yokoyama', orcid: '0000-0002-0566-7264' as Orcid },
    ],
    doi: '10.1101/2022.02.14.480364' as Doi<'1101'>,
    posted: PlainDate.from('2022-02-14'),
    server: 'bioRxiv',
    title: html`The Transcription Factor Bach2 Negatively Regulates Natural Killer Cell Maturation and Function`,
    url: new URL('https://www.biorxiv.org/content/10.1101/2022.02.14.480364v1.full'),
  },
}
