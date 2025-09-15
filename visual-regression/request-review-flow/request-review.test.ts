import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.js'
import { requestReviewPage } from '../../src/request-review-flow/request-review-page/request-review-page.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { Pseudonym } from '../../src/types/Pseudonym.js'
import type { User } from '../../src/user.js'
import { expect, test } from '../base.js'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = requestReviewPage({ preprint, locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when a user is logged in', async ({ showPage }) => {
  const response = requestReviewPage({ preprint, user, locale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
