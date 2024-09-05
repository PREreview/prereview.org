import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { rawHtml } from '../../src/html.js'
import * as _ from '../../src/my-prereviews-page/list-of-prereviews.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import { expect, test } from '../base.js'

import PlainDate = Temporal.PlainDate

test('content looks right', async ({ showPage }) => {
  const response = _.toResponse(
    _.ListOfPrereviews({
      prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
      user: {
        name: 'Josiah Carberry',
        orcid: Orcid('0000-0002-1825-0097'),
        pseudonym: 'Orange Panda' as Pseudonym,
      },
    }),
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const prereview1 = {
  id: 11062553,
  reviewers: ['Ashraya Ravikumar', 'Stephanie Wankowicz', '2 other authors'],
  published: PlainDate.from('2024-04-25'),
  fields: ['16'],
  subfields: ['1607'],
  preprint: {
    id: { type: 'arxiv', value: Doi('10.48550/arxiv.2402.04845') },
    language: 'en',
    title: rawHtml('AlphaFold Meets Flow Matching for Generating Protein Ensembles'),
  },
} satisfies _.Prereview

const prereview2 = {
  id: 10888905,
  club: 'reviewing-dental-articles-club',
  reviewers: ['Alain Manuel Chaple Gil'],
  published: PlainDate.from('2024-03-28'),
  fields: [],
  subfields: [],
  preprint: {
    id: { type: 'scielo', value: Doi('10.1590/scielopreprints.7628') },
    language: 'es',
    title: rawHtml('Grado de avance en Metas Sanitarias de salud bucal infantil en la Región del Maule'),
  },
} satisfies _.Prereview

const prereview3 = {
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
    id: { type: 'edarxiv', value: Doi('10.35542/osf.io/hsnke') },
    language: 'en',
    title: rawHtml('A population perspective on international students in Australian universities'),
  },
} satisfies _.Prereview

const prereview4 = {
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
    id: { type: 'biorxiv', value: Doi('10.1101/2023.12.21.572824') },
    language: 'en',
    title: rawHtml('Virion morphology and on-virus spike protein structures of diverse SARS-CoV-2 variants'),
  },
} satisfies _.Prereview

const prereview5 = {
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
  fields: ['12', '33'],
  subfields: ['1211', '3310', '1208'],
  preprint: {
    id: { type: 'scielo', value: Doi('10.1590/scielopreprints.7395') },
    language: 'pt',
    title: rawHtml('Traduções de sinais de pontuação desacompanhados em HQs'),
  },
} satisfies _.Prereview
