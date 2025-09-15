import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.js'
import { dataPresentationForm } from '../../../src/write-review/data-presentation-page/data-presentation-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = dataPresentationForm(
    preprint,
    {
      dataPresentation: E.right(undefined),
      dataPresentationInappropriateUnclearDetails: E.right(undefined),
      dataPresentationSomewhatInappropriateUnclearDetails: E.right(undefined),
      dataPresentationNeutralDetails: E.right(undefined),
      dataPresentationMostlyAppropriateClearDetails: E.right(undefined),
      dataPresentationHighlyAppropriateClearDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = dataPresentationForm(
    preprint,
    {
      dataPresentation: E.left(missingE()),
      dataPresentationInappropriateUnclearDetails: E.right(undefined),
      dataPresentationSomewhatInappropriateUnclearDetails: E.right(undefined),
      dataPresentationNeutralDetails: E.right(undefined),
      dataPresentationMostlyAppropriateClearDetails: E.right(undefined),
      dataPresentationHighlyAppropriateClearDetails: E.right(undefined),
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
