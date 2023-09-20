import type * as O from 'fp-ts/Option'
import * as RA from 'fp-ts/ReadonlyArray'
import type * as RNEA from 'fp-ts/ReadonlyNonEmptyArray'
import * as RR from 'fp-ts/ReadonlyRecord'
import { flow, pipe } from 'fp-ts/function'
import { Eq as stringEq } from 'fp-ts/string'
import { type Orcid, Eq as eqOrcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import type { ClubId } from './club-id'
import { type Html, html } from './html'

export interface Club {
  readonly name: string
  readonly description: Html
  readonly leads: RNEA.ReadonlyNonEmptyArray<{ name: string; orcid: Orcid }>
  readonly joinLink: URL
}

export const getClubDetails = (id: ClubId) => clubs[id]

export const getClubName = flow(getClubDetails, get('name'))

export const getClubByName = (name: string): O.Option<ClubId> =>
  pipe(RR.keys(clubs), RA.findFirst(flow(getClubDetails, club => stringEq.equals(club.name, name))))

export const isLeadFor = (orcid: Orcid): ReadonlyArray<ClubId> =>
  pipe(
    RR.keys(clubs),
    RA.filter(
      flow(
        getClubDetails,
        get('leads'),
        RA.some(lead => eqOrcid.equals(lead.orcid, orcid)),
      ),
    ),
  )

const clubs: RR.ReadonlyRecord<ClubId, Club> = {
  'asapbio-cancer-biology': {
    name: 'ASAPbio Cancer Biology Crowd',
    description: html`
      <p>
        The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
        cancer.
      </p>
    `,
    leads: [
      { name: 'Arpita Ghosh', orcid: '0009-0003-2106-3270' as Orcid },
      { name: 'Garima Jain', orcid: '0000-0002-8079-9611' as Orcid },
    ],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
    ),
  },
  'asapbio-meta-research': {
    name: 'ASAPbio Meta-Research Crowd',
    description: html`
      <p>
        The ASAPbio Meta-Research Crowd reviews preprints about the practices, policies and infrastructure of open
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
  },
  'asapbio-metabolism': {
    name: 'ASAPbio Metabolism Crowd',
    description: html`
      <p>
        The ASAPbio Metabolism Crowd reviews preprints about the regulation of metabolic homeostasis and pathophysiology
        of metabolic diseases, from cell biology to integrative physiology.
      </p>
    `,
    leads: [
      { name: 'Pablo Ranea-Robles', orcid: '0000-0001-6478-3815' as Orcid },
      { name: 'Jonathon Coates', orcid: '0000-0001-9039-9219' as Orcid },
    ],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
    ),
  },
  'asapbio-neurobiology': {
    name: 'ASAPbio Neurobiology Crowd',
    description: html`
      <p>The ASAPbio Neurobiology Crowd reviews preprints that focus on neurodevelopment and neurodegeneration.</p>
    `,
    leads: [
      { name: 'Bhargy Sharma', orcid: '0000-0003-2713-8563' as Orcid },
      { name: 'Anna Oliveras', orcid: '0000-0002-5880-5245' as Orcid },
      { name: 'Ryan John Cubero', orcid: '0000-0003-0002-1867' as Orcid },
    ],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
    ),
  },
  'language-club': {
    name: 'Language Club',
    description: html`
      <p>
        The Language Club is a community of linguists and language enthusiasts who share a common interest in language
        research and a commitment to open science.
      </p>
      <p>
        Our purpose is to offer timely and constructive peer feedback to authors of preprints in the field of
        linguistics. By doing so, we aim to foster a culture of transparency, collaboration, and responsible research
        practices.
      </p>
    `,
    leads: [{ name: 'Miguel Oliveira, Jr.', orcid: '0000-0002-0866-0535' as Orcid }],
    joinLink: new URL(
      'https://docs.google.com/forms/d/e/1FAIpQLScamu28Lkm2pBS1n-g0UpMmp8trCeGPVVdAxJ8MIauhlwx7Dw/viewform',
    ),
  },
}
