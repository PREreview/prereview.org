import { Doi } from 'doi-ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { OrcidId } from '../../src/types/OrcidId.ts'
import { Pseudonym } from '../../src/types/Pseudonym.ts'
import type { User } from '../../src/user.ts'
import { requestReviewPage } from '../../src/WebApp/request-review-flow/request-review-page/request-review-page.ts'
import { expect, test } from '../base.ts'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
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
