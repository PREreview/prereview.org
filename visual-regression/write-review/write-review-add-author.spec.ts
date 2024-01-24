import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { invalidE, missingE } from '../../src/form'
import { html, plainText } from '../../src/html'
import { page as templatePage } from '../../src/page'
import type { NonEmptyString } from '../../src/types/string'
import { addAuthorForm } from '../../src/write-review/add-author-page/add-author-form'
import { expect, test } from '../base'

test('content looks right', async ({ page }) => {
  const response = addAuthorForm({
    form: {
      name: E.right(undefined),
      emailAddress: E.right(undefined),
    },
    preprint: {
      id: {
        type: 'biorxiv',
        value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
      },
      title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
      language: 'en',
    },
  })

  const content = html`
    ${response.nav ? html` <nav data-testid="nav">${response.nav}</nav>` : ''}

    <main id="${response.skipToLabel}">${response.main}</main>
  `

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByTestId('nav')).toHaveScreenshot()
  await expect(page.getByRole('main')).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ page }) => {
  const response = addAuthorForm({
    form: {
      name: E.left(missingE()),
      emailAddress: E.left(missingE()),
    },
    preprint: {
      id: {
        type: 'biorxiv',
        value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
      },
      title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
      language: 'en',
    },
  })

  const content = html` <main id="${response.skipToLabel}">${response.main}</main>`

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})

test('content looks right when fields are invalid', async ({ page }) => {
  const response = addAuthorForm({
    form: {
      name: E.right('a name' as NonEmptyString),
      emailAddress: E.left(invalidE('not an email address')),
    },
    preprint: {
      id: {
        type: 'biorxiv',
        value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
      },
      title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
      language: 'en',
    },
  })

  const content = html` <main id="${response.skipToLabel}">${response.main}</main>`

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
