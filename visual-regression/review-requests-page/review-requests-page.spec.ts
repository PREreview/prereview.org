import { Temporal } from '@js-temporal/polyfill'
import type { Doi } from 'doi-ts'
import { rawHtml } from '../../src/html'
import type { ReviewRequests } from '../../src/review-requests-page'
import { createEmptyPage, createPage } from '../../src/review-requests-page/review-requests-page'
import { expect, test } from '../base'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    currentPage: 1,
    totalPages: 3,
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createEmptyPage({})

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a language', async ({ showPage }) => {
  const response = createPage({
    currentPage: 1,
    totalPages: 3,
    language: 'es',
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a field', async ({ showPage }) => {
  const response = createPage({
    currentPage: 1,
    totalPages: 3,
    field: '30',
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a language', async ({ showPage }) => {
  const response = createEmptyPage({ language: 'es' })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a field', async ({ showPage }) => {
  const response = createEmptyPage({ field: '30' })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on a middle page', async ({ showPage }) => {
  const response = createPage({
    currentPage: 2,
    totalPages: 3,
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on the last page', async ({ showPage }) => {
  const response = createPage({
    currentPage: 3,
    totalPages: 3,
    reviewRequests: [reviewRequest1],
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewRequest1 = {
  published: PlainDate.from('2024-04-24'),
  fields: ['33'],
  subfields: ['3304'],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8406' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest2 = {
  published: PlainDate.from('2024-04-24'),
  fields: [],
  subfields: [],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8470' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest3 = {
  published: PlainDate.from('2024-04-23'),
  fields: ['23', '13'],
  subfields: ['2303', '1312'],
  preprint: {
    id: { type: 'biorxiv', value: '10.1101/2024.04.20.590411' as Doi<'1101'> },
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest4 = {
  published: PlainDate.from('2024-04-23'),
  fields: ['23', '36', '33'],
  subfields: ['2307', '3600', '3308'],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.8326' as Doi<'1590'> },
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest5 = {
  published: PlainDate.from('2024-04-22'),
  fields: ['32'],
  subfields: ['3204'],
  preprint: {
    id: { type: 'scielo', value: '10.1590/scielopreprints.7792' as Doi<'1590'> },
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies ReviewRequests['reviewRequests'][number]
