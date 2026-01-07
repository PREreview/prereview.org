import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../../src/form.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { enterEmailAddressPage } from '../../../src/WebApp/write-review/enter-email-address-page/enter-email-address-page.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = enterEmailAddressPage(preprint, { emailAddress: E.right(undefined) }, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email is missing', async ({ showPage }) => {
  const response = enterEmailAddressPage(preprint, { emailAddress: E.left(missingE()) }, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the email is invalid', async ({ showPage }) => {
  const response = enterEmailAddressPage(preprint, { emailAddress: E.left(invalidE('invalid review')) }, locale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
