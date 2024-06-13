import type { Doi } from 'doi-ts'
import { html } from '../../src/html.js'
import type { PreprintTitle } from '../../src/preprint.js'
import type { Form } from '../../src/write-review/form.js'
import { carryOnPage } from '../../src/write-review/start-page/carry-on-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = carryOnPage(preprint, form)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const form = {} satisfies Form
