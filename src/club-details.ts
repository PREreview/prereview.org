import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import type { Orcid } from 'orcid-id-ts'
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
