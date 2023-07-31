import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import { flow } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import type { ClubId } from './club-id'
import { type Html, html } from './html'

export type Club = {
  readonly name: string
  readonly description: Html
  readonly leads: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid: Orcid }>
  readonly joinLink: URL
}

export const getClubDetails = (id: ClubId) =>
  match(id)
    .returnType<Club>()
    .with('asapbio-meta-research', () => ({
      name: 'ASAPbio Meta-Research Crowd',
      description: html`
        <p>
          The ASAPbio Meta-research Crowd reviews preprints about the practices, policies and infrastructure of open
          science and scholarship.
        </p>
      `,
      leads: [
        { name: 'Stephen Gabrielson', orcid: '0000-0001-9420-4466' as Orcid },
        { name: 'Jessica Polka', orcid: '0000-0001-6610-9293' as Orcid },
      ],
      joinLink: new URL(
        'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
      ),
    }))
    .with('asapbio-metabolism', () => ({
      name: 'ASAPbio Metabolism Crowd',
      description: html`
        <p>
          The ASAPbio Metabolism Crowd reviews preprints about the regulation of metabolic homeostasis and
          pathophysiology of metabolic diseases, from cell biology to integrative physiology.
        </p>
      `,
      leads: [
        { name: 'Pablo Ranea-Robles', orcid: '0000-0001-6478-3815' as Orcid },
        { name: 'Jonathon Coates', orcid: '0000-0001-9039-9219' as Orcid },
      ],
      joinLink: new URL(
        'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
      ),
    }))
    .exhaustive()

export const getClubName = flow(getClubDetails, get('name'))
