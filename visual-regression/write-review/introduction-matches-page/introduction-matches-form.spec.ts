import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.js'
import { introductionMatchesForm } from '../../../src/write-review/introduction-matches-page/introduction-matches-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = introductionMatchesForm(
    preprint,
    {
      introductionMatches: E.right(undefined),
      introductionMatchesYesDetails: E.right(undefined),
      introductionMatchesPartlyDetails: E.right(undefined),
      introductionMatchesNoDetails: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the answer is missing', async ({ showPage }) => {
  const response = introductionMatchesForm(
    preprint,
    {
      introductionMatches: E.left(missingE()),
      introductionMatchesYesDetails: E.right(undefined),
      introductionMatchesPartlyDetails: E.right(undefined),
      introductionMatchesNoDetails: E.right(undefined),
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
