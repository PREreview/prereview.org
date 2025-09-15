import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { addAuthorForm } from '../../src/write-review/add-author-page/add-author-form.js'
import { addMultipleAuthorsForm } from '../../src/write-review/add-author-page/add-multiple-authors.js'
import { expect, test } from '../base.js'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = addAuthorForm({
    form: {
      name: E.right(undefined),
      emailAddress: E.right(undefined),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = addAuthorForm({
    form: {
      name: E.left(missingE()),
      emailAddress: E.left(missingE()),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = addAuthorForm({
    form: {
      name: E.right(NonEmptyString('a name')),
      emailAddress: E.left(invalidE('not an email address')),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when entering multiple', async ({ showPage }) => {
  const response = addMultipleAuthorsForm({
    form: {
      authors: E.right(undefined),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when entering multiple and it is missing', async ({ showPage }) => {
  const response = addMultipleAuthorsForm({
    form: {
      authors: E.left(missingE()),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when entering multiple and it is invalid', async ({ showPage }) => {
  const response = addMultipleAuthorsForm({
    form: {
      authors: E.left(invalidE('not a list of names and email addresses')),
    },
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
