import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { resultsSupportedForm } from '../../../src/write-review/results-supported-page/results-supported-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = resultsSupportedForm(
    preprint,
    {
      resultsSupported: E.right(undefined),
      resultsSupportedNotSupportedDetails: E.right(undefined),
      resultsSupportedPartiallySupportedDetails: E.right(undefined),
      resultsSupportedNeutralDetails: E.right(undefined),
      resultsSupportedWellSupportedDetails: E.right(undefined),
      resultsSupportedStronglySupportedDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = resultsSupportedForm(
    preprint,
    {
      resultsSupported: E.left(missingE()),
      resultsSupportedNotSupportedDetails: E.right(undefined),
      resultsSupportedPartiallySupportedDetails: E.right(undefined),
      resultsSupportedNeutralDetails: E.right(undefined),
      resultsSupportedWellSupportedDetails: E.right(undefined),
      resultsSupportedStronglySupportedDetails: E.right(undefined),
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
