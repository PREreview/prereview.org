import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.ts'
import { shouldReadForm } from '../../../src/write-review/should-read-page/should-read-form.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = shouldReadForm(
    preprint,
    {
      shouldRead: E.right(undefined),
      shouldReadNoDetails: E.right(undefined),
      shouldReadYesButDetails: E.right(undefined),
      shouldReadYesDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = shouldReadForm(
    preprint,
    {
      shouldRead: E.left(missingE()),
      shouldReadNoDetails: E.right(undefined),
      shouldReadYesButDetails: E.right(undefined),
      shouldReadYesDetails: E.right(undefined),
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
