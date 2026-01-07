import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.ts'
import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.ts'
import { authorsForm } from '../../src/WebApp/write-review/authors/authors-form.ts'
import { expect, test } from '../base.ts'

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = authorsForm(
    preprint,
    {
      moreAuthors: E.right(undefined),
      moreAuthorsApproved: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when other authors is missing', async ({ showPage }) => {
  const response = authorsForm(
    preprint,
    {
      moreAuthors: E.left(missingE()),
      moreAuthorsApproved: E.right(undefined),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when approval is missing', async ({ showPage }) => {
  const response = authorsForm(
    preprint,
    {
      moreAuthors: E.right('yes'),
      moreAuthorsApproved: E.left(missingE()),
    },
    locale,
  )

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
