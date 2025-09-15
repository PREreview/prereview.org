import { Doi } from 'doi-ts'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../src/Preprints/index.js'
import { EmailAddress } from '../../src/types/EmailAddress.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { addAuthorsForm } from '../../src/write-review/add-authors-page/add-authors-form.js'
import { expect, test } from '../base.js'

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const locale = DefaultLocale

test('content looks right when there is another author', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [{ name: NonEmptyString('Josiah Carberry'), emailAddress: EmailAddress('jcarberry@example.com') }],
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ showPage }) => {
  const response = addAuthorsForm({
    authors: [
      { name: NonEmptyString('Josiah Carberry'), emailAddress: EmailAddress('jcarberry@example.com') },
      { name: NonEmptyString('Jean-Baptiste Botul'), emailAddress: EmailAddress('jbbotul@example.com') },
      { name: NonEmptyString('Arne Saknussemm'), emailAddress: EmailAddress('asaknussemm@example.com') },
      { name: NonEmptyString('Otto Lidenbrock'), emailAddress: EmailAddress('olidenbrock@example.com') },
    ],
    preprint,
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
