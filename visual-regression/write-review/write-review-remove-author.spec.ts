import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { removeAuthorForm } from '../../src/write-review/remove-author-page/remove-author-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = removeAuthorForm({
    author: { name: NonEmptyString('Josiah Carberry') },
    form: { removeAuthor: E.right(undefined) },
    number: 1,
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ showPage }) => {
  const response = removeAuthorForm({
    author: { name: NonEmptyString('Josiah Carberry') },
    form: { removeAuthor: E.left(missingE()) },
    number: 1,
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
