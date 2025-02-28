import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { Orcid } from 'orcid-id-ts'
import { missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import type { User } from '../../src/user.js'
import { authorsForm } from '../../src/write-review/authors/authors-form.js'
import { expect, test } from '../base.js'

const locale = DefaultLocale

test('content looks right', async ({ page, showHtml, templatePage }) => {
  const pageHtml = authorsForm(
    preprint,
    {
      moreAuthors: E.right(undefined),
      moreAuthorsApproved: E.right(undefined),
    },
    user,
    locale,
  )({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

test('content looks right when other authors is missing', async ({ page, showHtml, templatePage }) => {
  const pageHtml = authorsForm(
    preprint,
    {
      moreAuthors: E.left(missingE()),
      moreAuthorsApproved: E.right(undefined),
    },
    user,
    locale,
  )({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

test('content looks right when approval is missing', async ({ page, showHtml, templatePage }) => {
  const pageHtml = authorsForm(
    preprint,
    {
      moreAuthors: E.right('yes'),
      moreAuthorsApproved: E.left(missingE()),
    },
    user,
    locale,
  )({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

const preprint = {
  id: {
    type: 'biorxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User
