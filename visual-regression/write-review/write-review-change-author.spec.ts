import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import type { PreprintTitle } from '../../src/preprint.js'
import type { EmailAddress } from '../../src/types/email-address.js'
import type { NonEmptyString } from '../../src/types/string.js'
import { changeAuthorForm } from '../../src/write-review/change-author-page/change-author-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

test('content looks right', async ({ showPage }) => {
  const response = changeAuthorForm({
    author: { name: 'Josiah Carberry' as NonEmptyString },
    form: {
      name: E.right('Josiah Carberry' as NonEmptyString),
      emailAddress: E.right('jcarberry@example.com' as EmailAddress),
    },
    number: 1,
    preprint,
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
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
