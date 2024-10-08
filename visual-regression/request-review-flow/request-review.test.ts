import { Doi } from 'doi-ts'
import { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { requestReviewPage } from '../../src/request-review-flow/request-review-page/request-review-page.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import type { User } from '../../src/user.js'
import { expect, test } from '../base.js'

const preprint = {
  id: {
    type: 'biorxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  },
  title: html`Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

test('content looks right', async ({ showPage }) => {
  const response = requestReviewPage({ preprint })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when a user is logged in', async ({ showPage }) => {
  const response = requestReviewPage({ preprint, user })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
