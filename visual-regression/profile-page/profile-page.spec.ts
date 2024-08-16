import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { rawHtml } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { createPage } from '../../src/profile-page/create-page.js'
import type { Prereviews } from '../../src/profile-page/prereviews.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import type { NonEmptyString } from '../../src/types/string.js'
import { expect, test } from '../base.js'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'orcid',
      name: 'Josiah Carberry' as NonEmptyString,
      orcid: '0000-0002-1825-0097' as Orcid,
      slackUser: {
        name: 'jcarberry',
        image: new URL('https://placehold.co/48x48'),
        profile: new URL('http://example.com/'),
      },
      careerStage: 'late',
      researchInterests: 'Psychoceramics' as NonEmptyString,
      location: 'Providence, Rhode Island' as NonEmptyString,
      languages: 'English' as NonEmptyString,
      clubs: ['asapbio-cancer-biology', 'language-club'],
      avatar: new URL('https://placehold.co/300x300'),
      isOpenForRequests: true,
      prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'orcid',
      name: 'Josiah Carberry' as NonEmptyString,
      orcid: '0000-0002-1825-0097' as Orcid,
      slackUser: undefined,
      careerStage: undefined,
      researchInterests: undefined,
      location: undefined,
      languages: undefined,
      clubs: [],
      avatar: undefined,
      isOpenForRequests: false,
      prereviews: [],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a pseudonym', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'pseudonym',
      name: 'Orange Panda' as Pseudonym,
      prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a pseudonym when empty', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'pseudonym',
      name: 'Orange Panda' as Pseudonym,
      prereviews: [],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const prereview1 = {
  id: 11062553,
  reviewers: ['Ashraya Ravikumar', 'Stephanie Wankowicz', '2 other authors'],
  published: PlainDate.from('2024-04-25'),
  fields: ['16'],
  subfields: ['1607'],
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
  fields: [],
  subfields: [],
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
  fields: ['27'],
  subfields: ['2746'],
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
  fields: ['27', '23'],
  subfields: ['2725', '2303'],
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
  fields: ['12', '33'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7395' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies Prereviews[number]
