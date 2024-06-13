import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { pasteReviewForm } from '../../../src/write-review/write-review-page/paste-review-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.right(undefined) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a review', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.right(undefined) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the review is missing', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.left(missingE()) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
