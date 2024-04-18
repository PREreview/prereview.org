import type { Doi } from 'doi-ts'
import { html } from '../../src/html'
import type { PreprintTitle } from '../../src/preprint'
import { requestReviewPage } from '../../src/request-review-flow/request-review-page/request-review-page'
import { expect, test } from '../base'

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`Cytoplasmic protein-free mRNA induces stress granules by two G3BP1/2-dependent mechanisms`,
  language: 'en',
} satisfies PreprintTitle

test('content looks right', async ({ showPage }) => {
  const response = requestReviewPage(preprint)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
