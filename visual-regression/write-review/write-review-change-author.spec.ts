import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { EmailAddress } from '../../src/types/email-address.js'
import type { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { changeAuthorForm } from '../../src/write-review/change-author-page/change-author-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: {
    _tag: 'biorxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = changeAuthorForm({
    author: { name: 'Josiah Carberry' as NonEmptyString },
    form: {
      name: E.right('Josiah Carberry' as NonEmptyString),
      emailAddress: E.right(EmailAddress('jcarberry@example.com')),
    },
    number: 1,
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = changeAuthorForm({
    author: { name: 'Josiah Carberry' as NonEmptyString },
    form: {
      name: E.left(missingE()),
      emailAddress: E.left(missingE()),
    },
    number: 1,
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = changeAuthorForm({
    author: { name: 'Josiah Carberry' as NonEmptyString },
    form: {
      name: E.right('Josiah Carberry' as NonEmptyString),
      emailAddress: E.left(invalidE('not an email address')),
    },
    number: 1,
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
