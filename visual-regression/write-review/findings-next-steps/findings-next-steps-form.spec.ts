import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { findingsNextStepsForm } from '../../../src/WebApp/write-review/findings-next-steps/findings-next-steps-form.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = findingsNextStepsForm(
    preprint,
    {
      findingsNextSteps: E.right(undefined),
      findingsNextStepsInadequatelyDetails: E.right(undefined),
      findingsNextStepsInsufficientlyDetails: E.right(undefined),
      findingsNextStepsAdequatelyDetails: E.right(undefined),
      findingsNextStepsClearlyInsightfullyDetails: E.right(undefined),
      findingsNextStepsExceptionallyDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = findingsNextStepsForm(
    preprint,
    {
      findingsNextSteps: E.left(missingE()),
      findingsNextStepsInadequatelyDetails: E.right(undefined),
      findingsNextStepsInsufficientlyDetails: E.right(undefined),
      findingsNextStepsAdequatelyDetails: E.right(undefined),
      findingsNextStepsClearlyInsightfullyDetails: E.right(undefined),
      findingsNextStepsExceptionallyDetails: E.right(undefined),
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
