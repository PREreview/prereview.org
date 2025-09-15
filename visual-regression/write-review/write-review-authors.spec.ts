import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { BiorxivPreprintId } from '../../src/Preprints/index.js'
import { authorsForm } from '../../src/write-review/authors/authors-form.js'
import { expect, test } from '../base.js'

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
