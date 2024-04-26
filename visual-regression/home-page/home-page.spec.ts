import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import type { RecentPrereview } from '../../src/home-page'
import { createPage } from '../../src/home-page/home-page'
import type { RecentReviewRequest } from '../../src/home-page/recent-review-requests'
import { rawHtml } from '../../src/html'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    canRequestReviews: false,
    recentReviewRequests: [
      recentReviewRequest1,
      recentReviewRequest2,
      recentReviewRequest3,
      recentReviewRequest4,
      recentReviewRequest5,
    ],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({
    recentPrereviews: [],
    canRequestReviews: false,
    recentReviewRequests: [],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when reviews can be requested', async ({ showPage }) => {
  const response = createPage({
    recentPrereviews: [recentPrereview1],
    canRequestReviews: true,
    recentReviewRequests: [recentReviewRequest1],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const recentPrereview1 = {
  id: 11062553,
  reviewers: ['Ashraya Ravikumar', 'Stephanie Wankowicz', '2 other authors'],
  published: PlainDate.from('2024-04-25'),
  preprint: {
    id: { type: 'arxiv', value: '10.48550/arxiv.2402.04845' as Doi<'48550'> },
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
} satisfies RecentPrereview

const recentPrereview2 = {
  id: 10888905,
  club: 'reviewing-dental-articles-club',
  reviewers: ['Alain Manuel Chaple Gil'],
  published: PlainDate.from('2024-03-28'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7628' as Doi<'1590'> },
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies RecentPrereview

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
  preprint: {
    id: { type: 'edarxiv', value: '10.35542/osf.io/hsnke' as Doi<'35542'> },
    language: 'en',
    title: rawHtml('A population perspective on international students in Australian universities'),
  },
} satisfies RecentPrereview

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
  preprint: {
    id: { type: 'biorxiv', value: '10.1101/2023.12.21.572824' as Doi<'1101'> },
    language: 'en',
    title: rawHtml('Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants'),
  },
} satisfies RecentPrereview

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
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7395' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies RecentPrereview

const recentReviewRequest1 = {
  published: PlainDate.from('2024-04-24'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8406' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest2 = {
  published: PlainDate.from('2024-04-24'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8470' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest3 = {
  published: PlainDate.from('2024-04-23'),
  preprint: {
    id: { type: 'biorxiv', value: '10.1101/2024.04.20.590411' as Doi<'1101'> },
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest4 = {
  published: PlainDate.from('2024-04-23'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8326' as Doi<'1590'> },
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest5 = {
  published: PlainDate.from('2024-04-22'),
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7792' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies RecentReviewRequest
