import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { createPage } from '../../src/home-page/home-page.js'
import type { RecentPrereview } from '../../src/home-page/index.js'
import type { RecentReviewRequest } from '../../src/home-page/recent-review-requests.js'
import { rawHtml } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { ArxivPreprintId, BiorxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/types/preprint-id.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    recentPrereviews: [recentPrereview1, recentPrereview2, recentPrereview3, recentPrereview4, recentPrereview5],
    recentReviewRequests: [
      recentReviewRequest1,
      recentReviewRequest2,
      recentReviewRequest3,
      recentReviewRequest4,
      recentReviewRequest5,
    ],
    statistics,
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({
    recentPrereviews: [],
    recentReviewRequests: [],
    statistics,
    locale: DefaultLocale,
  })

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
} satisfies RecentPrereview

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
} satisfies RecentPrereview

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
} satisfies RecentPrereview

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
} satisfies RecentPrereview

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
  fields: ['12', '33'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7395') }),
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies RecentPrereview

const recentReviewRequest1 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: ['33'],
  subfields: ['3304'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8406') }),
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest2 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8470') }),
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest3 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '13'],
  subfields: ['2303', '1312'],
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2024.04.20.590411') }),
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest4 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '36', '33'],
  subfields: ['2307', '3600', '3308'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8326') }),
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies RecentReviewRequest

const recentReviewRequest5 = {
  published: Temporal.PlainDate.from('2024-04-22'),
  fields: ['32'],
  subfields: ['3204'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7792') }),
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies RecentReviewRequest

const statistics = { prereviews: 887, servers: 22, users: 2736 }
