import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { missingE } from '../../src/form'
import { html } from '../../src/html'
import type { PreprintTitle } from '../../src/preprint'
import type { EmailAddress } from '../../src/types/email-address'
import type { NonEmptyString } from '../../src/types/string'
import { addAuthorsForm } from '../../src/write-review/add-authors-page/add-authors-form'
import { cannotAddAuthorsForm } from '../../src/write-review/add-authors-page/cannot-add-authors-form'
import { expect, test } from '../base'

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

test('content looks right', async ({ showPage }) => {
  const response = cannotAddAuthorsForm({ preprint })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is another author', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [{ name: 'Josiah Carberry' as NonEmptyString, emailAddress: 'jcarberry@example.com' as EmailAddress }],
    form: {
      anotherAuthor: E.right(undefined),
    },
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [
      { name: 'Josiah Carberry' as NonEmptyString, emailAddress: 'jcarberry@example.com' as EmailAddress },
      { name: 'Jean-Baptiste Botul' as NonEmptyString, emailAddress: 'jbbotul@example.com' as EmailAddress },
      { name: 'Arne Saknussemm' as NonEmptyString, emailAddress: 'asaknussemm@example.com' as EmailAddress },
      { name: 'Otto Lidenbrock' as NonEmptyString, emailAddress: 'olidenbrock@example.com' as EmailAddress },
    ],
    form: {
      anotherAuthor: E.right(undefined),
    },
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [{ name: 'Josiah Carberry' as NonEmptyString, emailAddress: 'jcarberry@example.com' as EmailAddress }],
    form: {
      anotherAuthor: E.left(missingE()),
    },
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
