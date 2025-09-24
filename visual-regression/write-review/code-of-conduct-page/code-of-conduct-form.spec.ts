import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/index.ts'
import { codeOfConductForm } from '../../../src/write-review/code-of-conduct-page/code-of-conduct-form.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = codeOfConductForm(preprint, { conduct: E.right(undefined) }, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = codeOfConductForm(preprint, { conduct: E.left(missingE()) }, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi.Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
