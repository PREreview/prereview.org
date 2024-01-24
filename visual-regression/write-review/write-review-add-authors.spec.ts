import type { Page } from '@playwright/test'
import type { Doi } from 'doi-ts'
import * as E from 'fp-ts/Either'
import { missingE } from '../../src/form'
import { html, plainText } from '../../src/html'
import { page as templatePage } from '../../src/page'
import type { PreprintTitle } from '../../src/preprint'
import type { StreamlinePageResponse } from '../../src/response'
import { addAuthorsForm } from '../../src/write-review/add-authors-page/add-authors-form'
import { cannotAddAuthorsForm } from '../../src/write-review/add-authors-page/cannot-add-authors-form'
import { expect, test } from '../base'

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

test('content looks right', async ({ page }) => {
  const response = cannotAddAuthorsForm({ preprint })

  const { nav, main } = await showPage(response, page)

  await expect(nav).toHaveScreenshot()
  await expect(main).toHaveScreenshot()
})

test('content looks right when there are other authors', async ({ page }) => {
  const response = addAuthorsForm({
    form: {
      anotherAuthor: E.right(undefined),
    },
    preprint,
  })

  const { nav, main } = await showPage(response, page)

  await expect(nav).toHaveScreenshot()
  await expect(main).toHaveScreenshot()
})

test('content looks right when fields are missing', async ({ page }) => {
  const response = addAuthorsForm({
    form: {
      anotherAuthor: E.left(missingE()),
    },
    preprint,
  })

  const { main } = await showPage(response, page)

  await expect(main).toHaveScreenshot()
})

async function showPage(response: StreamlinePageResponse, page: Page) {
  const content = html`
    ${response.nav ? html` <nav data-testid="nav">${response.nav}</nav>` : ''}

    <main id="${response.skipToLabel}">${response.main}</main>
  `

  const pageHtml = templatePage({
    content,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  return {
    nav: page.getByTestId('nav'),
    main: page.getByRole('main'),
  }
}
