import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { rawHtml } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { ReviewRequests } from '../../src/review-requests-page/index.js'
import { createEmptyPage, createPage } from '../../src/review-requests-page/review-requests-page.js'
import { BiorxivPreprintId, ScieloPreprintId } from '../../src/types/preprint-id.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    currentPage: 1,
    totalPages: 3,
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createEmptyPage({ locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with a language', async ({ showPage }) => {
  const response = createPage({
    currentPage: 1,
    totalPages: 3,
    language: 'es',
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
    locale: DefaultLocale,
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
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a language', async ({ showPage }) => {
  const response = createEmptyPage({ language: 'es', locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty with a field', async ({ showPage }) => {
  const response = createEmptyPage({ field: '30', locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on a middle page', async ({ showPage }) => {
  const response = createPage({
    currentPage: 2,
    totalPages: 3,
    reviewRequests: [reviewRequest1, reviewRequest2, reviewRequest3, reviewRequest4, reviewRequest5],
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks on the last page', async ({ showPage }) => {
  const response = createPage({
    currentPage: 3,
    totalPages: 3,
    reviewRequests: [reviewRequest1],
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const reviewRequest1 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: ['33'],
  subfields: ['3304'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8406') }),
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest2 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8470') }),
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest3 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '13'],
  subfields: ['2303', '1312'],
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2024.04.20.590411') }),
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest4 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '36', '33'],
  subfields: ['2307', '3600', '3308'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8326') }),
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies ReviewRequests['reviewRequests'][number]

const reviewRequest5 = {
  published: Temporal.PlainDate.from('2024-04-22'),
  fields: ['32'],
  subfields: ['3204'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7792') }),
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies ReviewRequests['reviewRequests'][number]
