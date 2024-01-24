import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { invalidE, missingE } from '../../src/form'
import { html } from '../../src/html'
import type { PreprintTitle } from '../../src/preprint'
import type { NonEmptyString } from '../../src/types/string'
import { addAuthorForm } from '../../src/write-review/add-author-page/add-author-form'
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
