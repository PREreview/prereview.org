import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import * as Personas from '../../src/Personas/index.ts'
import { ArxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import { Uuid } from '../../src/types/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import * as _ from '../../src/WebApp/my-prereviews-page/list-of-prereviews.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(
    _.ListOfPrereviews({
      prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
      user: {
        name: NonEmptyString('Josiah Carberry'),
        orcid: OrcidId('0000-0002-1825-0097'),
        pseudonym: Pseudonym('Orange Panda'),
      },
    }),
    DefaultLocale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const prereview1 = new Prereviews.RecentPreprintPrereview({
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
})

const prereview2 = new Prereviews.RecentPreprintPrereview({
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
})

const prereview3 = new Prereviews.RecentPreprintPrereview({
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
})

const prereview4 = new Prereviews.RecentDatasetPrereview({
  author: new Personas.PublicPersona({
    orcidId: OrcidId('0000-0002-1825-0097'),
    name: NonEmptyString('Josiah Carberry'),
  }),
  dataset: new Datasets.DatasetTitle({
    id: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
    language: 'en',
    title: rawHtml('Metadata collected from 500 articles in the field of ecology and evolution'),
  }),
  doi: Doi('10.5281/zenodo.10779310'),
  id: Uuid.Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  published: Temporal.PlainDate.from('2025-08-06'),
})

const prereview5 = new Prereviews.RecentPreprintPrereview({
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
})
