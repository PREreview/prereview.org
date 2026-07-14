import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { ArxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import { Uuid } from '../../src/types/index.ts'
import { Name } from '../../src/types/Name.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { Slug } from '../../src/types/Slug.ts'
import { createPage } from '../../src/WebApp/profile-page/create-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage(
    {
      type: 'orcid',
      name: Name('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
      slackUser: {
        name: Name('jcarberry'),
        image: new URL('https://placehold.co/48x48'),
        profile: new URL('http://example.com/'),
      },
      careerStage: 'late',
      researchInterests: NonEmptyString('Psychoceramics'),
      location: NonEmptyString('Providence, Rhode Island'),
      languages: NonEmptyString('English'),
      clubs: ['13e21570-0d1a-47f0-b378-b8c20776496a', '998f32b4-ced9-49f8-8042-ce8fe41e62ec'],
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
      name: Name('Josiah Carberry'),
      orcid: OrcidId('0000-0002-1825-0097'),
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

const prereview1 = new Prereviews.RecentPreprintPrereview({
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

const prereview2 = new Prereviews.RecentPreprintPrereview({
  id: 10888905,
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

const prereview3 = new Prereviews.RecentPreprintPrereview({
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

const prereview4 = new Prereviews.RecentDatasetPrereview({
  author: new Prereviewers.PublicPersona({
    orcidId: OrcidId('0000-0002-1825-0097'),
    name: Name('Josiah Carberry'),
  }),
  otherAuthors: [new Prereviewers.PseudonymPersona({ pseudonym: Pseudonym('Orange Panda') })],
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

const prereview5 = new Prereviews.RecentDatasetPrereview({
  doi: Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('b589babb-9604-4c1e-abf9-5111be8dcc01'),
  club: {
    id: Uuid.Uuid('998f32b4-ced9-49f8-8042-ce8fe41e62ec'),
    language: 'en',
    name: Name('Language Club'),
    slug: Slug('language-club'),
  },
  author: new Prereviewers.PublicPersona({
    orcidId: OrcidId('0000-0002-1825-0097'),
    name: Name('Miguel Oliveira, Jr.'),
  }),
  otherAuthors: [
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0003-4806-4946'),
      name: Name('Arthur Ronald Brasil Terto'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0002-9340-9977'),
      name: Name('Cleber Ataíde'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0002-2934-4734'),
      name: Name('Glayci Kelli Reis da Silva Xavier'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0002-0509-3555'),
      name: Name('Kyvia Fernanda Tenório da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0002-5425-5071'),
      name: Name('Marcelo Travassos da Silva'),
    }),
    new Prereviewers.PublicPersona({
      orcidId: OrcidId('0000-0002-7547-3430'),
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
