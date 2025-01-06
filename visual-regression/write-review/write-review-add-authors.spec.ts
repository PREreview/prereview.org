import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { EmailAddress } from '../../src/types/email-address.js'
import type { NonEmptyString } from '../../src/types/string.js'
import { addAuthorsForm } from '../../src/write-review/add-authors-page/add-authors-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: {
    type: 'biorxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const locale = DefaultLocale

test('content looks right when there is another author', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [{ name: 'Josiah Carberry' as NonEmptyString, emailAddress: EmailAddress('jcarberry@example.com') }],
    form: {
      anotherAuthor: E.right(undefined),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [
      { name: 'Josiah Carberry' as NonEmptyString, emailAddress: EmailAddress('jcarberry@example.com') },
      { name: 'Jean-Baptiste Botul' as NonEmptyString, emailAddress: EmailAddress('jbbotul@example.com') },
      { name: 'Arne Saknussemm' as NonEmptyString, emailAddress: EmailAddress('asaknussemm@example.com') },
      { name: 'Otto Lidenbrock' as NonEmptyString, emailAddress: EmailAddress('olidenbrock@example.com') },
    ],
    form: {
      anotherAuthor: E.right(undefined),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [{ name: 'Josiah Carberry' as NonEmptyString, emailAddress: EmailAddress('jcarberry@example.com') }],
    form: {
      anotherAuthor: E.left(missingE()),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
