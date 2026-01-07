import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { readyFullReviewForm } from '../../../src/WebApp/write-review/ready-full-review-page/ready-full-review-form.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = readyFullReviewForm(
    preprint,
    {
      readyFullReview: E.right(undefined),
      readyFullReviewNoDetails: E.right(undefined),
      readyFullReviewYesChangesDetails: E.right(undefined),
      readyFullReviewYesDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = readyFullReviewForm(
    preprint,
    {
      readyFullReview: E.left(missingE()),
      readyFullReviewNoDetails: E.right(undefined),
      readyFullReviewYesChangesDetails: E.right(undefined),
      readyFullReviewYesDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
