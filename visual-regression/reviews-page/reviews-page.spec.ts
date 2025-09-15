import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { rawHtml } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { ArxivPreprintId, BiorxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.js'
import type { RecentPrereviews } from '../../src/reviews-page/index.js'
import { createPage, emptyPage } from '../../src/reviews-page/reviews-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a query', async ({ showPage }) => {
  const response = createPage(
    {
      currentPage: 1,
      totalPages: 3,
      query: NonEmptyString('Josiah Carberry'),
      recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    },
    DefaultLocale,
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
    DefaultLocale,
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
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = emptyPage({}, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a query', async ({ showPage }) => {
  const response = emptyPage({ query: NonEmptyString('Josiah Carberry') }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a language', async ({ showPage }) => {
  const response = emptyPage({ language: 'es' }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a field', async ({ showPage }) => {
  const response = emptyPage({ field: '30' }, DefaultLocale)

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
    DefaultLocale,
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
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const recentPrereview1 = {
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview2 = {
  id: 10888905,
  club: 'reviewing-dental-articles-club',
  reviewers: { named: ['Alain Manuel Chaple Gil'], anonymous: 0 },
  published: Temporal.PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7628') }),
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview3 = {
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview4 = {
  id: 10779310,
  club: 'hhmi-training-pilot',
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
} satisfies RecentPrereviews['recentPrereviews'][number]

const recentPrereview5 = {
  id: 10411168,
  club: 'language-club',
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
  fields: ['12', '33', '12'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7395') }),
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies RecentPrereviews['recentPrereviews'][number]
