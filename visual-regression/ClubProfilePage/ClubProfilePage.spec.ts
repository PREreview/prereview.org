import { Temporal } from '@js-temporal/polyfill'
import { Doi } from 'doi-ts'
import type { ClubId } from '../../src/Clubs/index.ts'
import * as Datasets from '../../src/Datasets/index.ts'
import { html, rawHtml } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { ArxivPreprintId, EdarxivPreprintId, ScieloPreprintId } from '../../src/Preprints/index.ts'
import * as Prereviewers from '../../src/Prereviewers/index.ts'
import * as Prereviews from '../../src/Prereviews/index.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Name } from '../../src/types/Name.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import { Slug } from '../../src/types/Slug.ts'
import { Uuid } from '../../src/types/Uuid.ts'
import { type ClubDetails, createPage } from '../../src/WebApp/ClubProfilePage/ClubProfilePage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage({
    club: club1,
    id,
    prereviews: [prereview1, prereview2, prereview3, prereview4, prereview5],
    locale: DefaultLocale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createPage({ club: club2, id, prereviews: [], locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const club1 = {
  name: {
    language: 'en',
    text: Name('ASAPbio Cancer Biology Crowd'),
  },
  slug: Slug('asapbio-cancer-biology'),
  description: {
    language: 'en',
    text: html`
      <p>
        The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
        cancer.
      </p>
    `,
  },

  added: Temporal.PlainDate.from('2024-01-02'),
  leads: [
    { name: Name('Arpita Ghosh'), orcid: OrcidId('0009-0003-2106-3270') },
    { name: Name('Garima Jain'), orcid: OrcidId('0000-0002-8079-9611') },
  ],
  contact: EmailAddress('email@example.com'),
  joinLink: new URL(
    'https://docs.google.com/forms/d/e/1FAIpQLScOR3oM_9OOhRKxjQvupN8YLtaGImOfKskkllrveTWIqrJUVg/viewform',
  ),
} satisfies ClubDetails

const club2 = {
  name: {
    language: 'en',
    text: Name('ASAPbio Cancer Biology Crowd'),
  },
  slug: Slug('asapbio-cancer-biology'),
  description: {
    language: 'en',
    text: html`
      <p>
        The ASAPbio Cancer Biology Crowd reviews preprints of biochemical, molecular and cellular studies concerning
        cancer.
      </p>
    `,
  },
  added: Temporal.PlainDate.from('2025-02-03'),
  leads: [{ name: Name('Arpita Ghosh'), orcid: OrcidId('0009-0003-2106-3270') }],
} satisfies ClubDetails

const id = '13e21570-0d1a-47f0-b378-b8c20776496a' satisfies ClubId

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
  id: Uuid('2da3f8dc-b177-47be-87e2-bd511565c85a'),
  published: Temporal.PlainDate.from('2025-08-06'),
})

const prereview5 = new Prereviews.RecentPreprintPrereview({
  id: 10411168,
  reviewers: {
    named: [
      Name('Miguel Oliveira, Jr.'),
      Name('Arthur Ronald Brasil Terto'),
      Name('Cleber Ataíde'),
      Name('Glayci Kelli Reis da Silva Xavier'),
      Name('Kyvia Fernanda Tenório da Silva'),
      Name('Marcelo Travassos da Silva'),
      Name('Pedro Ricardo Bin'),
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
