import { Doi } from 'doi-ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import * as _ from '../../../src/WebApp/RequestAReviewFlow/RequestAReviewOfThisPreprintPage/RequestAReviewOfThisPreprintPage.ts'
import { expect, test } from '../../base.ts'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms`,
  language: 'en',
} satisfies PreprintTitle

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = _.RequestAReviewOfThisPreprintPage({ preprint, isLoggedIn: false, locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when a user is logged in', async ({ showPage }) => {
  const response = _.RequestAReviewOfThisPreprintPage({ preprint, isLoggedIn: true, locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
