import * as RTE from 'fp-ts/ReaderTaskEither'
import { Orcid } from 'orcid-id-ts'
import { html } from './html'
import { Preprint } from './preprint'
import { PhilsciPreprintId } from './preprint-id'

export const getPreprintFromPhilsci = (id: PhilsciPreprintId) =>
  id.value === 21986
    ? RTE.right({
        abstract: {
          language: 'en',
          text: html`<p>
            In response to broad transformations brought about by the digitalization, globalization, and commodification
            of research processes, the Open Science [OS] movement aims to foster the wide dissemination, scrutiny and
            re-use of research components for the good of science and society. This Element examines the role played by
            OS principles and practices within contemporary research and how this relates to the epistemology of
            science. After reviewing some of the concerns that have prompted calls for more openness, I highlight how
            the interpretation of openness as the sharing of resources, so often encountered in OS initiatives and
            policies, may have the unwanted effect of constraining epistemic diversity and worsening epistemic
            injustice, resulting in unreliable and unethical scientific knowledge. By contrast, I propose to frame
            openness as the effort to establish judicious connections among systems of practice, predicated on a
            process-oriented view of research as a tool for effective and responsible agency.
          </p>`,
        },
        authors: [
          {
            name: 'Sabina Leonelli',
            orcid: '0000-0002-7815-6609' as Orcid,
          },
        ],
        id: {
          type: 'philsci',
          value: 21986,
        },
        posted: 2023,
        title: {
          language: 'en',
          text: html`Philosophy of Open Science`,
        },
        url: new URL('https://philsci-archive.pitt.edu/21986/'),
      } as Preprint)
    : RTE.left('not-found' as const)
