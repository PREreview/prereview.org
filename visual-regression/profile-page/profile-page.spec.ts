import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { rawHtml } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { createPage } from '../../src/profile-page/create-page.js'
import type { Prereviews } from '../../src/profile-page/prereviews.js'
import type { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import { expect, test } from '../base.js'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'orcid',
      name: 'Josiah Carberry' as NonEmptyString,
      orcid: Orcid('0000-0002-1825-0097'),
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
      orcid: Orcid('0000-0002-1825-0097'),
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
      name: Pseudonym('Orange Panda'),
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
      name: Pseudonym('Orange Panda'),
      prereviews: [],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const prereview1 = {
  id: 11062553,
  reviewers: { named: ['Ashraya Ravikumar', 'Stephanie Wankowicz'], anonymous: 2 },
  published: PlainDate.from('2024-04-25'),
  fields: ['16'],
  subfields: ['1607'],
  preprint: {
    id: { _tag: 'arxiv', value: Doi('10.48550/arxiv.2402.04845') },
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
} satisfies Prereviews[number]

const prereview2 = {
  id: 10888905,
  reviewers: { named: ['Alain Manuel Chaple Gil'], anonymous: 0 },
  published: PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: { _tag: 'scielo', value: Doi('10.1590/scielopreprints.7628') },
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies Prereviews[number]

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
  published: PlainDate.from('2024-03-25'),
  fields: ['27'],
  subfields: ['2746'],
  preprint: {
    id: { _tag: 'edarxiv', value: Doi('10.35542/osf.io/hsnke') },
    language: 'en',
    title: rawHtml('A population perspective on international students in Australian universities'),
  },
} satisfies Prereviews[number]

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
  published: PlainDate.from('2024-03-04'),
  fields: ['27', '23'],
  subfields: ['2725', '2303'],
  preprint: {
    id: { _tag: 'biorxiv', value: Doi('10.1101/2023.12.21.572824') },
    language: 'en',
    title: rawHtml('Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants'),
  },
} satisfies Prereviews[number]

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
  published: PlainDate.from('2023-12-20'),
  fields: ['12', '33'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: { _tag: 'scielo', value: Doi('10.1590/scielopreprints.7395') },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies Prereviews[number]
