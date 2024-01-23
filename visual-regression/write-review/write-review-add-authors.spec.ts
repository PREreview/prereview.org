import type { Doi } from 'doi-ts'
import type { JsonRecord } from 'fp-ts/Json'
import * as TE from 'fp-ts/TaskEither'
import Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { html, plainText } from '../../src/html'
import { page as templatePage } from '../../src/page'
import type { Pseudonym } from '../../src/types/pseudonym'
import { writeReviewAddAuthors } from '../../src/write-review'
import { saveForm } from '../../src/write-review/form'
import { expect, test } from '../base'

test('content looks right', async ({ page }) => {
  const formStore = new Keyv<JsonRecord>()
  await saveForm('0000-0002-1825-0097' as Orcid, {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  })({ moreAuthors: 'yes' })({ formStore })()

  const response = await writeReviewAddAuthors({
    id: {
      type: 'biorxiv-medrxiv',
      value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
    },
    method: 'GET',
    user: {
      name: 'Josiah Carberry',
      orcid: '0000-0002-1825-0097' as Orcid,
      pseudonym: 'Orange Panda' as Pseudonym,
    },
  })({
    formStore,
    getPreprintTitle: () =>
      TE.right({
        id: {
          type: 'biorxiv',
          value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
        },
        title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
        language: 'en',
      }),
  })()

  if (response._tag !== 'StreamlinePageResponse') {
    throw new Error('incorrect page response')
  }

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
