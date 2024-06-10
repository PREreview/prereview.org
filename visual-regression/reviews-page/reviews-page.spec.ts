import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { rawHtml } from '../../src/html'
import type { RecentPrereviews } from '../../src/reviews-page'
import { createPage, emptyPage } from '../../src/reviews-page/reviews-page'
import type { NonEmptyString } from '../../src/types/string'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    false,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a query', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      query: 'Josiah Carberry' as NonEmptyString,
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    true,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a language', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      language: 'es',
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    false,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a field', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      field: '30',
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    false,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = emptyPage({}, false)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a query', async ({ showPage }) => {
  const response = emptyPage({ query: 'Josiah Carberry' as NonEmptyString }, true)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a language', async ({ showPage }) => {
  const response = emptyPage({ language: 'es' }, false)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a field', async ({ showPage }) => {
  const response = emptyPage({ field: '30' }, false)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on a middle page', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 2,
      totalPages: 3,
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    false,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on the last page', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 3,
      totalPages: 3,
      recentPrereviews: [recentPrereview1],
    },
    false,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const recentPrereview1 = {
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview2 = {
  id: 10888905,
  club: 'reviewing-dental-articles-club',
  reviewers: ['Alain Manuel Chaple Gil'],
  published: PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7628' as Doi<'1590'> },
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview3 = {
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview4 = {
  id: 10779310,
  club: 'hhmi-training-pilot',
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview5 = {
  id: 10411168,
  club: 'language-club',
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
  fields: ['12', '33', '12'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7395' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies RecentPrereviews['recentPrereviews'][number]
