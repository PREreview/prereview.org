import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { createPage } from '../../src/club-profile-page/club-profile-page.ts'
import type { Club, ClubId } from '../../src/Clubs/index.ts'
import { html, rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { ArxivPreprintId, BiorxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import type * as Prereviews from '../../src/Prereviews/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    club: club1,
    id,
    prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({ club: club2, id, prereviews: [], locale: DefaultLocale })

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
  added: Temporal.PlainDate.from('2024-01-02'),
  leads: [
    { name: 'Arpita Ghosh', orcid: OrcidId('0009-0003-2106-3270') },
    { name: 'Garima Jain', orcid: OrcidId('0000-0002-8079-9611') },
  ],
  contact: EmailAddress('email@example.com'),
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
  added: Temporal.PlainDate.from('2025-02-03'),
  leads: [{ name: 'Arpita Ghosh', orcid: OrcidId('0009-0003-2106-3270') }],
} satisfies Club

const id = 'asapbio-cancer-biology' satisfies ClubId

const prereview1 = {
  id: 11062553,
  reviewers: { named: ['Ashraya Ravikumar', 'Stephanie Wankowicz'], anonymous: 2 },
  published: Temporal.PlainDate.from('2024-04-25'),
  fields: ['16'],
  subfields: ['1607'],
  preprint: {
    id: new ArxivPreprintId({ value: Doi('10.48550/arxiv.2402.04845') }),
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
} satisfies Prereviews.RecentPrereview

const prereview2 = {
  id: 10888905,
  reviewers: { named: ['Alain Manuel Chaple Gil'], anonymous: 0 },
  published: Temporal.PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7628') }),
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies Prereviews.RecentPrereview

const prereview3 = {
  id: 10870479,
  reviewers: {
    named: [
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
    ],
    anonymous: 3,
  },
  published: Temporal.PlainDate.from('2024-03-25'),
  fields: ['27'],
  subfields: ['2746'],
  preprint: {
    id: new EdarxivPreprintId({ value: Doi('10.35542/osf.io/hsnke') }),
    language: 'en',
    title: rawHtml('A population perspective on international students in Australian universities'),
  },
} satisfies Prereviews.RecentPrereview

const prereview4 = {
  id: 10779310,
  reviewers: {
    named: [
      'James Fraser',
      'Luisa Vasconcelos',
      'Liyi Cheng',
      'Samantha  Lish',
      'S. Chan Baek',
      'Lang Ding',
      'Alexandra Probst',
      'Naiya Phillips',
      'William Grubbe',
    ],
    anonymous: 3,
  },
  published: Temporal.PlainDate.from('2024-03-04'),
  fields: ['27', '23'],
  subfields: ['2725', '2303'],
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2023.12.21.572824') }),
    language: 'en',
    title: rawHtml('Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants'),
  },
} satisfies Prereviews.RecentPrereview

const prereview5 = {
  id: 10411168,
  reviewers: {
    named: [
      'Miguel Oliveira, Jr.',
      'Arthur Ronald Brasil Terto',
      'Cleber Ataíde',
      'Glayci Kelli Reis da Silva Xavier',
      'Kyvia Fernanda Tenório da Silva',
      'Marcelo Travassos da Silva',
      'Pedro Ricardo Bin',
    ],
    anonymous: 0,
  },
  published: Temporal.PlainDate.from('2023-12-20'),
  fields: ['12', '33'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7395') }),
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies Prereviews.RecentPrereview
