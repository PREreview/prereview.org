import { Doi } from 'doi-ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.ts'
import type { Form } from '../../src/WebApp/write-review/form.ts'
import { carryOnPage } from '../../src/WebApp/write-review/start-page/carry-on-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = carryOnPage(preprint, form, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const form = {} satisfies Form
