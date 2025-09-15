import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import type { PreprintTitle } from '../../../src/preprint.js'
import { BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { Doi } from '../../../src/types/index.js'
import { codeOfConductForm } from '../../../src/write-review/code-of-conduct-page/code-of-conduct-form.js'
import { expect, test } from '../../base.js'

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
