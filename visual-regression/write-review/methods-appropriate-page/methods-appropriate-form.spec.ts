import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { methodsAppropriateForm } from '../../../src/write-review/methods-appropriate-page/methods-appropriate-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = methodsAppropriateForm(
    preprint,
    {
      methodsAppropriate: E.right(undefined),
      methodsAppropriateInappropriateDetails: E.right(undefined),
      methodsAppropriateSomewhatInappropriateDetails: E.right(undefined),
      methodsAppropriateAdequateDetails: E.right(undefined),
      methodsAppropriateMostlyAppropriateDetails: E.right(undefined),
      methodsAppropriateHighlyAppropriateDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = methodsAppropriateForm(
    preprint,
    {
      methodsAppropriate: E.left(missingE()),
      methodsAppropriateInappropriateDetails: E.right(undefined),
      methodsAppropriateSomewhatInappropriateDetails: E.right(undefined),
      methodsAppropriateAdequateDetails: E.right(undefined),
      methodsAppropriateMostlyAppropriateDetails: E.right(undefined),
      methodsAppropriateHighlyAppropriateDetails: E.right(undefined),
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
