import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { html } from '../../src/html'
import type { PreprintTitle } from '../../src/preprint'
import type { NonEmptyString } from '../../src/types/string'
import { removeAuthorForm } from '../../src/write-review/remove-author-page/remove-author-form'
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
  const response = removeAuthorForm({
    author: { name: 'Josiah Carberry' as NonEmptyString },
    form: { removeAuthor: E.right(undefined) },
    number: 1,
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
