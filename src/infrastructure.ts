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
    doi: '10.1101/2022.01.13.476201' as Doi,
    posted: new Date('2022-01-14'),
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
    doi: '10.1101/2022.02.14.480364' as Doi,
    posted: new Date('2022-02-14'),
    title: html`The Transcription Factor Bach2 Negatively Regulates Natural Killer Cell Maturation and Function`,
    url: new URL('https://www.biorxiv.org/content/10.1101/2022.02.14.480364v1.full'),
  },
}
