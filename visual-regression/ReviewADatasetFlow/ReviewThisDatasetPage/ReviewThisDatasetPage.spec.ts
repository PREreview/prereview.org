import { Temporal } from '@js-temporal/polyfill'
import { Option } from 'effect'
import * as Datasets from '../../../src/Datasets/index.ts'
import { html } from '../../../src/html.ts'
import * as _ from '../../../src/ReviewADatasetFlow/ReviewThisDatasetPage/ReviewThisDatasetPage.ts'
import { Doi } from '../../../src/types/index.ts'
import { NonEmptyString } from '../../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import type { User } from '../../../src/user.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.ReviewThisDatasetPage({ dataset, user: Option.none() })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when logged in', async ({ showPage }) => {
  const response = _.ReviewThisDatasetPage({ dataset, user: Option.some(user) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const dataset = new Datasets.Dataset({
  abstract: {
    text: html`
      <p>
        The submitted dataset contains the metadata collected from 500 articles in the field of ecology and evolution.
        This includes articles from the following journals: Ecology and Evolution, PLoS One, Proceedings of the Royal
        Society B, Ecology and the preprint server bioRxiv. Direct identifiers have been removed from the dataset. These
        included the first and last names of authors. No more than three indirect identifiers have been provided.
        Information found herein includes article titles, number of authors and ECR status, among others. A README file
        has been attached to provide greater details about the dataset.
      </p>
    `,
    language: 'en',
  },
  authors: [
    { name: 'Jesse Wolf' },
    { name: 'Layla MacKay' },
    { name: 'Sarah Haworth' },
    { name: 'Morgan Dedato' },
    { name: 'Kiana Young' },
    { name: 'Marie-Laurence Cossette' },
    { name: 'Colin Elliott' },
    { name: 'Rebekah Oomen' },
  ],
  id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
  posted: Temporal.PlainDate.from('2022-09-02'),
  title: {
    text: html`Metadata collected from 500 articles in the field of ecology and evolution`,
    language: 'en',
  },
  url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
})

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
