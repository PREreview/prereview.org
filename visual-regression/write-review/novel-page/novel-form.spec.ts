import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { novelForm } from '../../../src/write-review/novel-page/novel-form.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = novelForm(
    preprint,
    {
      novel: E.right(undefined),
      novelNoDetails: E.right(undefined),
      novelLimitedDetails: E.right(undefined),
      novelSomeDetails: E.right(undefined),
      novelSubstantialDetails: E.right(undefined),
      novelHighlyDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = novelForm(
    preprint,
    {
      novel: E.left(missingE()),
      novelNoDetails: E.right(undefined),
      novelLimitedDetails: E.right(undefined),
      novelSomeDetails: E.right(undefined),
      novelSubstantialDetails: E.right(undefined),
      novelHighlyDetails: E.right(undefined),
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
