import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { ArxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import { OrcidId, Pseudonym, Uuid } from '../../src/types/index.ts'
import { Name } from '../../src/types/Name.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { createPage, emptyPage } from '../../src/WebApp/reviews-page/reviews-page.ts'
import { expect, test } from '../base.ts'

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

const recentPrereview1 = new Prereviews.RecentPreprintPrereview({
  id: 11062553,
  reviewers: { named: [Name('Ashraya Ravikumar'), Name('Stephanie Wankowicz')], anonymous: 2 },
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
  reviewers: { named: [Name('Alain Manuel Chaple Gil')], anonymous: 0 },
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
      Name('Vanessa Fairhurst'),
      Name('Femi Qudus Arogundade'),
      Name('Cesar Acevedo-Triana'),
      Name('Kylie Yui Dan'),
      Name('Emerald Swan'),
      Name('Lamis Elkheir'),
      Name('Hickory Jaguar'),
      Name('Syeda Azra'),
      Name('María Sol Ruiz'),
      Name('Juan Bizzotto'),
      Name('Janaynne Carvalho do Amaral'),
      Name('Ebuka Ezeike'),
      Name('Ranea-Robles P.'),
      Name('María Eugenia Segretin'),
      Name('Samir  Hachani'),
      Name('Anna Oliveras'),
      Name('Prof. MI Subhani, PhD., PDoc.'),
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
    name: Name('Josiah Carberry'),
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
    name: Name('Miguel Oliveira, Jr.'),
  }),
  otherAuthors: [
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0003-4806-4946'),
      name: Name('Arthur Ronald Brasil Terto'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-9340-9977'),
      name: Name('Cleber Ataíde'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-2934-4734'),
      name: Name('Glayci Kelli Reis da Silva Xavier'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-0509-3555'),
      name: Name('Kyvia Fernanda Tenório da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-5425-5071'),
      name: Name('Marcelo Travassos da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId.OrcidId('0000-0002-7547-3430'),
      name: Name('Pedro Ricardo Bin'),
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
