import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { ArxivPreprintId, BiorxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import type * as ReviewRequests from '../../src/ReviewRequests/index.ts'
import { Name, OrcidId, Pseudonym, Uuid } from '../../src/types/index.ts'
import { createPage } from '../../src/WebApp/HomePage/HomePage.ts'
import { expect, test } from '../base.ts'

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

const recentPrereview1 = new Prereviews.RecentPreprintPrereview({
  id: 11062553,
  reviewers: {
    named: [Name.Name('Ashraya Ravikumar'), Name.Name('Stephanie Wankowicz')],
    anonymous: 2,
  },
  published: Temporal.PlainDate.from('2024-04-25'),
  fields: ['16'],
  subfields: ['1607'],
  preprint: {
    id: new ArxivPreprintId({ value: Doi('10.48550/arxiv.2402.04845') }),
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
})

const recentPrereview2 = new Prereviews.RecentPreprintPrereview({
  id: 10888905,
  club: '4f8076fc-2219-49fc-be5f-6682ca7cc009',
  reviewers: { named: [Name.Name('Alain Manuel Chaple Gil')], anonymous: 0 },
  published: Temporal.PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7628') }),
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
})

const recentPrereview3 = new Prereviews.RecentPreprintPrereview({
  id: 10870479,
  reviewers: {
    named: [
      Name.Name('Vanessa Fairhurst'),
      Name.Name('Femi Qudus Arogundade'),
      Name.Name('Cesar Acevedo-Triana'),
      Name.Name('Kylie Yui Dan'),
      Name.Name('Emerald Swan'),
      Name.Name('Lamis Elkheir'),
      Name.Name('Hickory Jaguar'),
      Name.Name('Syeda Azra'),
      Name.Name('María Sol Ruiz'),
      Name.Name('Juan Bizzotto'),
      Name.Name('Janaynne Carvalho do Amaral'),
      Name.Name('Ebuka Ezeike'),
      Name.Name('Ranea-Robles P.'),
      Name.Name('María Eugenia Segretin'),
      Name.Name('Samir  Hachani'),
      Name.Name('Anna Oliveras'),
      Name.Name('Prof. MI Subhani, PhD., PDoc.'),
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
})

const recentPrereview4 = new Prereviews.RecentDatasetPrereview({
  author: new Prereviewers.PublicPersona({
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    name: Name.Name('Josiah Carberry'),
  }),
  otherAuthors: [new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym.Pseudonym('Orange Panda') })],
  anonymousAuthors: 1,
  dataset: new Datasets.DatasetTitle({
    id: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
    language: 'en',
    title: rawHtml('Metadata collected from 500 articles in the field of ecology and evolution'),
  }),
  doi: Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  published: Temporal.PlainDate.from('2025-08-06'),
})

const recentPrereview5 = new Prereviews.RecentDatasetPrereview({
  doi: Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('b589babb-9604-4c1e-abf9-5111be8dcc01'),
  club: '998f32b4-ced9-49f8-8042-ce8fe41e62ec',
  author: new Prereviewers.PublicPersona({
    orcidId: OrcidId.OrcidId('0000-0002-1825-0097'),
    name: Name.Name('Miguel Oliveira, Jr.'),
  }),
  otherAuthors: [
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0003-4806-4946'),
      name: Name.Name('Arthur Ronald Brasil Terto'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-9340-9977'),
      name: Name.Name('Cleber Ataíde'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-2934-4734'),
      name: Name.Name('Glayci Kelli Reis da Silva Xavier'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-0509-3555'),
      name: Name.Name('Kyvia Fernanda Tenório da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-5425-5071'),
      name: Name.Name('Marcelo Travassos da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-7547-3430'),
      name: Name.Name('Pedro Ricardo Bin'),
    }),
  ],
  anonymousAuthors: 1,
  published: Temporal.PlainDate.from('2023-12-20'),
  dataset: new Datasets.DatasetTitle({
    id: new Datasets.ScieloDatasetId({ value: Doi('10.48331/scielodata.4sp3xa') }),
    language: 'pt',
    title: rawHtml(
      'Data for: Reversão das recomendações emitidas pela Comissão Nacional de Incorporação de Tecnologias no SUS após Consultas Públicas',
    ),
  }),
})

const recentReviewRequest1 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: ['33'],
  subfields: ['3304'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8406') }),
    language: 'pt',
    title: rawHtml('TENDÊNCIAS TEMÁTICAS DE PESQUISAS SOBRE FORMAÇÃO DE PROFESSORES: REVISÃO BIBLIOMÉTRICA'),
  },
} satisfies ReviewRequests.ReviewRequest

const recentReviewRequest2 = {
  published: Temporal.PlainDate.from('2024-04-24'),
  fields: [],
  subfields: [],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8470') }),
    language: 'pt',
    title: rawHtml('CORPOS, SOCIEDADE E ESPAÇOS ACADÊMICOS: IDENTIDADES SUBALTERNAS E O DESAFIO DA CIDADANIA'),
  },
} satisfies ReviewRequests.ReviewRequest

const recentReviewRequest3 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '13'],
  subfields: ['2303', '1312'],
  preprint: {
    id: new BiorxivPreprintId({ value: Doi('10.1101/2024.04.20.590411') }),
    language: 'en',
    title: rawHtml('A Blueprint for Broadly Effective Bacteriophage Therapy Against Bacterial Infections'),
  },
} satisfies ReviewRequests.ReviewRequest

const recentReviewRequest4 = {
  published: Temporal.PlainDate.from('2024-04-23'),
  fields: ['23', '36', '33'],
  subfields: ['2307', '3600', '3308'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.8326') }),
    language: 'es',
    title: rawHtml('FACTORES ASOCIADOS A LA ERC-5 EN PACIENTES DE UNA EPS DEL VALLE DEL CAUCA 2018-2020'),
  },
} satisfies ReviewRequests.ReviewRequest

const recentReviewRequest5 = {
  published: Temporal.PlainDate.from('2024-04-22'),
  fields: ['32'],
  subfields: ['3204'],
  preprint: {
    id: new ScieloPreprintId({ value: Doi('10.1590/scielopreprints.7792') }),
    language: 'pt',
    title: rawHtml('A VARIAÇÃO LEXICAL E FONOLÓGICA NA LIBRAS NA EXPRESSÃO DO CONCEITO ‘ELEVADOR’'),
  },
} satisfies ReviewRequests.ReviewRequest

const statistics = { prereviews: 887, servers: 22, users: 2736 }
