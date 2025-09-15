import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { readyFullReviewForm } from '../../../src/write-review/ready-full-review-page/ready-full-review-form.js'
import { expect, test } from '../../base.js'

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
