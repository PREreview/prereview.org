import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import type { Club } from '../../src/club-details'
import { createPage } from '../../src/club-profile-page/club-profile-page'
import type { Prereviews } from '../../src/club-profile-page/prereviews'
import { html, rawHtml } from '../../src/html'
import type { ClubId } from '../../src/types/club-id'
import type { EmailAddress } from '../../src/types/email-address'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    club: club1,
    id,
    prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({ club: club2, id, prereviews: [] })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const club1 = {
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
  contact: 'email@example.com' as EmailAddress,
  joinLink: new URL(
    'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
  ),
} satisfies Club

const club2 = {
  name: 'ASAPbio Cancer Biology Crowd',
  description: html`
    <p>
      The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
      cancer.
    </p>
  `,
  leads: [{ name: 'Arpita Ghosh', orcid: '0009-0003-2106-3270' as Orcid }],
} satisfies Club

const id = 'asapbio-cancer-biology' satisfies ClubId

const prereview1 = {
  id: 11062553,
  reviewers: ['Ashraya Ravikumar', 'Stephanie Wankowicz', '2 other authors'],
  published: PlainDate.from('2024-04-25'),
  preprint: {
    id: { type: 'arxiv', value: '10.48550/arxiv.2402.04845' as Doi<'48550'> },
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
} satisfies Prereviews[number]

const prereview2 = {
  id: 10888905,
  reviewers: ['Alain Manuel Chaple Gil'],
  published: PlainDate.from('2024-03-28'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7628' as Doi<'1590'> },
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies Prereviews[number]

const prereview3 = {
  id: 10870479,
  reviewers: [
    'Vanessa Fairhurst',
    'Femi Qudus Arogundade',
    'Cesar Acevedo-Triana',
    'Kylie Yui Dan',
    'Emerald Swan',
    'Lamis Elkheir',
    'Hickory Jaguar',
    'Syeda Azra',
    'María Sol Ruiz',
    'Juan Bizzotto',
    'Janaynne Carvalho do Amaral',
    'Ebuka Ezeike',
    'Ranea-Robles P.',
    'María Eugenia Segretin',
    'Samir  Hachani',
    'Anna Oliveras',
    'Prof. MI Subhani, PhD., PDoc.',
    '3 other authors',
  ],
  published: PlainDate.from('2024-03-25'),
  preprint: {
    id: { type: 'edarxiv', value: '10.35542/osf.io/hsnke' as Doi<'35542'> },
    language: 'en',
    title: rawHtml('A population perspective on international students in Australian universities'),
  },
} satisfies Prereviews[number]

const prereview4 = {
  id: 10779310,
  reviewers: [
    'James Fraser',
    'Luisa Vasconcelos',
    'Liyi Cheng',
    'Samantha  Lish',
    'S. Chan Baek',
    'Lang Ding',
    'Alexandra Probst',
    'Naiya Phillips',
    'William Grubbe',
    '3 other authors',
  ],
  published: PlainDate.from('2024-03-04'),
  preprint: {
    id: { type: 'biorxiv', value: '10.1101/2023.12.21.572824' as Doi<'1101'> },
    language: 'en',
    title: rawHtml('Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants'),
  },
} satisfies Prereviews[number]

const prereview5 = {
  id: 10411168,
  reviewers: [
    'Miguel Oliveira, Jr.',
    'Arthur Ronald Brasil Terto',
    'Cleber Ataíde',
    'Glayci Kelli Reis da Silva Xavier',
    'Kyvia Fernanda Tenório da Silva',
    'Marcelo Travassos da Silva',
    'Pedro Ricardo Bin',
  ],
  published: PlainDate.from('2023-12-20'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7395' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies Prereviews[number]
