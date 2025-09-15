import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { pasteReviewForm } from '../../../src/write-review/write-review-page/paste-review-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.right(undefined) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a review', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.right(undefined) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the review is missing', async ({ showPage }) => {
  const response = pasteReviewForm(preprint, { review: E.left(missingE()) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
