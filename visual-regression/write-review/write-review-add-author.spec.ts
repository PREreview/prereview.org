import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../src/form.js'
import { html } from '../../src/html.js'
import type { PreprintTitle } from '../../src/preprint.js'
import type { NonEmptyString } from '../../src/types/string.js'
import { addAuthorForm } from '../../src/write-review/add-author-page/add-author-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: {
    type: 'biorxiv',
    value: Doi('10.1101/2022.01.13.476201'),
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

test('content looks right', async ({ showPage }) => {
  const response = addAuthorForm({
    form: {
      name: E.right(undefined),
      emailAddress: E.right(undefined),
    },
    preprint,
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
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when fields are invalid', async ({ showPage }) => {
  const response = addAuthorForm({
    form: {
      name: E.right('a name' as NonEmptyString),
      emailAddress: E.left(invalidE('not an email address')),
    },
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
